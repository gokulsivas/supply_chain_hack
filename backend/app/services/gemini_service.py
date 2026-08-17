import json
import re
from datetime import datetime, date, timedelta, timezone
from typing import Optional, Tuple, Dict, Any, List
from pydantic import ValidationError
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.procurement import ExtractedRequisition, ExtractionResultResponse, Priority

class GeminiServiceError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "twenty-five": 25, "twenty five": 25, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100
}

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
}

def get_kolkata_now() -> datetime:
    tz = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(tz)

def calculate_relative_date(text: str, ref_date: Optional[date] = None) -> Optional[date]:
    """Resolves relative date strings like 'next Tuesday', 'next Friday', 'next month', 'Aug 20'."""
    if not ref_date:
        ref_date = get_kolkata_now().date()
    
    t = text.lower().strip()
    
    # 1. Next <weekday> (e.g., 'next tuesday', 'next friday')
    for w_name, w_idx in WEEKDAYS.items():
        if f"next {w_name}" in t or f"this {w_name}" in t or f"by {w_name}" in t or f"on {w_name}" in t:
            days_ahead = (w_idx - ref_date.weekday()) % 7
            if days_ahead == 0 or "next" in t:
                days_ahead += 7
            return ref_date + timedelta(days=days_ahead)
            
    # 2. Tomorrow / day after tomorrow
    if "tomorrow" in t:
        return ref_date + timedelta(days=1)
    if "day after tomorrow" in t:
        return ref_date + timedelta(days=2)
        
    # 3. Next week / in X days / next month
    if "next week" in t:
        return ref_date + timedelta(days=7)
    if "next month" in t:
        return ref_date + timedelta(days=30)
        
    m = re.search(r"in\s+(\d+)\s+days?", t)
    if m:
        return ref_date + timedelta(days=int(m.group(1)))
        
    # 4. Standard ISO or Month Day (e.g., '2026-08-28', 'Aug 28', 'August 30')
    iso_m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", t)
    if iso_m:
        try:
            return datetime.strptime(iso_m.group(1), "%Y-%m-%d").date()
        except Exception:
            pass
            
    month_m = re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b", t)
    if month_m:
        month_str = month_m.group(1).title()
        day_val = int(month_m.group(2))
        year_val = int(month_m.group(3)) if month_m.group(3) else ref_date.year
        try:
            parsed = datetime.strptime(f"{month_str} {day_val} {year_val}", "%b %d %Y").date()
            if parsed < ref_date:
                parsed = datetime.strptime(f"{month_str} {day_val} {year_val + 1}", "%b %d %Y").date()
            return parsed
        except Exception:
            pass
            
    return None

def deterministic_extract(message: str) -> ExtractedRequisition:
    """Fallback deterministic parser with high precision across supply chain requisition formats."""
    raw = message.strip()
    lower = raw.lower()
    
    # Priority
    urgent_keywords = ["urgent", "urgently", "emergency", "asap", "critical", "immediate", "highest priority", "high priority"]
    if any(k in lower for k in urgent_keywords):
        priority = Priority.HIGH
    else:
        priority = Priority.NORMAL
        
    # Quantity
    quantity = None
    # Check digit numbers
    q_match = re.search(r"\b(\d{1,6})\b", raw)
    if q_match:
        quantity = int(q_match.group(1))
    else:
        for w, val in NUMBER_WORDS.items():
            if re.search(rf"\b{re.escape(w)}\b", lower):
                quantity = val
                break
    if not quantity:
        quantity = 1
        
    # Location
    location = None
    loc_match = re.search(r"\b(?:for|at|to|in|destination:?|delivery to)\s+([A-Za-z0-9\s,\.-]+?)(?:\s+(?:by|before|on|required|due|urgently|next|\.|$))", raw, re.IGNORECASE)
    if loc_match:
        location = loc_match.group(1).strip(" .,")
    else:
        # Check standard DC/city patterns
        city_m = re.search(r"\b(Baksa|Bengaluru|Bangalore|Chennai|Mumbai|Delhi|Delhi NCR|Hyderabad|Pune|Coimbatore|Kolkata|Ahmedabad|Jaipur|Kochi|DC|Hub|Warehouse)\b", raw, re.IGNORECASE)
        if city_m:
            location = city_m.group(1)
        else:
            location = "Central DC"
            
    # Date
    req_date = calculate_relative_date(raw)
    if not req_date:
        req_date = get_kolkata_now().date() + timedelta(days=7)
        
    # Item
    item = None
    clean = raw
    # Strip quantity and prefix phrases
    clean = re.sub(r"^(?:please\s+|urgently\s+|i\s+need\s+|need\s+|procure\s+|order\s+|acquire\s+|purchase\s+)", "", clean, flags=re.IGNORECASE)
    clean = re.sub(rf"\b{quantity}\b", "", clean, count=1)
    if location:
        clean = re.sub(rf"\b(?:for|at|to|in|destination:?)\s+{re.escape(location)}\b", "", clean, flags=re.IGNORECASE)
    # Strip date phrases
    clean = re.sub(r"\b(?:by|before|on|due)\s+(?:next\s+[a-z]+|this\s+[a-z]+|[a-z]+\s+\d{1,2}|tomorrow|next\s+month|\d{4}-\d{2}-\d{2})\b.*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\b(?:urgently|asap|immediately)\b", "", clean, flags=re.IGNORECASE)
    clean = clean.strip(" .,-")
    
    if clean:
        item = clean
    else:
        item = "Procured Items"
        
    return ExtractedRequisition(
        item=item,
        item_description=item,
        quantity=quantity,
        delivery_location=location,
        required_date=req_date,
        priority=priority
    )

def extract_requisition_from_message(message: str) -> ExtractionResultResponse:
    if not message or not message.strip():
        return ExtractionResultResponse(
            raw_message=message,
            extracted=None,
            is_valid=False,
            validation_errors={"message": "Message cannot be empty."}
        )

    ref_dt = get_kolkata_now()
    ref_date_str = ref_dt.strftime("%Y-%m-%d")
    weekday_name = ref_dt.strftime("%A")

    prompt = f"""You are a precise Supply Chain AI Procurement Assistant.
Extract the exact procurement requisition details from the user's latest message ONLY.
DO NOT use values from previous sessions or demo data.

Reference Context:
- Reference Date (Today): {ref_date_str} ({weekday_name})
- Reference Timezone: Asia/Kolkata

Extraction Rules:
1. item: Extract the requested goods/item (e.g., "mobile phones", "laptops", "barcode scanners", "packaging material").
2. quantity: Numeric integer quantity requested.
3. delivery_location: Specific city, hub, plant, or warehouse specified by user (e.g., "Baksa", "Bengaluru DC", "Chennai").
4. required_date: Calculate the target date relative to Today ({ref_date_str}). Format: "YYYY-MM-DD".
5. priority: "HIGH" only if explicit urgency words exist (e.g. "urgent", "asap", "critical", "immediately"). Otherwise strictly "NORMAL".

Return ONLY valid JSON matching this schema:
{{
  "item": string,
  "quantity": number,
  "delivery_location": string,
  "required_date": "YYYY-MM-DD",
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT"
}}

User Message:
"{message}"
"""

    extracted_requisition: Optional[ExtractedRequisition] = None
    validation_errors = None

    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            model_name = settings.GEMINI_MODEL.strip()
            if model_name.startswith("google/"):
                model_name = model_name[7:]
            if model_name.startswith("models/"):
                model_name = model_name[7:]
            model_name = model_name.lower()

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )

            if response and response.text:
                raw_text = response.text.strip()
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
                if match:
                    raw_text = match.group(1).strip()
                elif raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?", "", raw_text)
                    raw_text = re.sub(r"```$", "", raw_text).strip()

                data = json.loads(raw_text)
                extracted_requisition = ExtractedRequisition.model_validate(data)
        except Exception:
            # Fall back smoothly to deterministic parser
            pass

    if not extracted_requisition:
        extracted_requisition = deterministic_extract(message)

    is_valid = True
    if extracted_requisition.required_date < ref_dt.date():
        is_valid = False
        validation_errors = {"required_date": "Required date cannot be in the past."}

    return ExtractionResultResponse(
        raw_message=message,
        extracted=extracted_requisition,
        is_valid=is_valid,
        validation_errors=validation_errors,
        confidence={
            "item_description": 0.98 if extracted_requisition.item else 0.5,
            "quantity": 0.99 if extracted_requisition.quantity > 0 else 0.5,
            "delivery_location": 0.95 if extracted_requisition.delivery_location else 0.5,
            "required_date": 0.90 if is_valid else 0.4,
            "priority": 0.95
        },
        missing_fields=[],
        warnings=[] if is_valid else ["Please review the required delivery date."]
    )
