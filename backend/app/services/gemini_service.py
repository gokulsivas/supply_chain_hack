import json
import re
from datetime import datetime
from pydantic import ValidationError
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.procurement import ExtractedRequisition, ExtractionResultResponse

class GeminiServiceError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

def extract_requisition_from_message(message: str) -> ExtractionResultResponse:
    if not settings.GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key is not configured. Extraction is currently unavailable.")

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        raise GeminiServiceError("Failed to initialize Gemini client.")

    today = datetime.now().strftime("%Y-%m-%d")
    
    prompt = f"""
Extract the procurement requisition details from the following message.
Current date for relative resolution (e.g., "next Friday") is: {today}

Return ONLY strict, valid JSON matching this schema exactly, and nothing else. Do not include markdown formatting or backticks.
Schema:
{{
  "item": string,
  "quantity": number,
  "delivery_location": string,
  "required_date": "YYYY-MM-DD",
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT"
}}

Message:
"{message}"
"""

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
    except Exception as e:
        raise GeminiServiceError("Failed to connect to Gemini API or received an invalid response.")

    if not response.text:
        raise GeminiServiceError("Gemini API returned an empty response.")

    raw_text = response.text.strip()
    
    # Strip markdown fences if present
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?", "", raw_text)
        raw_text = re.sub(r"```$", "", raw_text).strip()

    try:
        extracted_data = json.loads(raw_text)
    except json.JSONDecodeError:
        raise GeminiServiceError("Gemini API returned malformed JSON.")

    try:
        # Validate against the Pydantic schema
        valid_extracted = ExtractedRequisition.model_validate(extracted_data)
        
        # Check date is not in the past
        if valid_extracted.required_date < datetime.now().date():
            return ExtractionResultResponse(
                raw_message=message,
                extracted=valid_extracted,
                is_valid=False,
                validation_errors={"required_date": "Required date cannot be in the past."}
            )
            
        return ExtractionResultResponse(
            raw_message=message,
            extracted=valid_extracted,
            is_valid=True,
            validation_errors=None
        )
    except ValidationError as e:
        errors = {}
        for err in e.errors():
            loc = ".".join([str(l) for l in err["loc"]])
            errors[loc] = err["msg"]
            
        # Still return the extracted data if it's somewhat parsable, to show the user what was misunderstood
        return ExtractionResultResponse(
            raw_message=message,
            extracted=None,  # Not fully valid
            is_valid=False,
            validation_errors=errors
        )
