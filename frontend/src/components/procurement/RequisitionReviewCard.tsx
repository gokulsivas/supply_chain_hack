import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { createPurchaseRequest, isApiError } from "@/lib/api";
import type { 
  ExtractionResultResponse, 
  PurchaseRequest,
} from "@/types/procurement";

const schema = z.object({
  item: z.string().min(2, "Item must be at least 2 characters"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").max(100000, "Quantity too high"),
  delivery_location: z.string().min(1, "Delivery location is required"),
  required_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

type FormData = z.infer<typeof schema>;

interface RequisitionReviewCardProps {
  extraction: ExtractionResultResponse;
  onCreated: (pr: PurchaseRequest) => void;
  onCancel: () => void;
}

export function RequisitionReviewCard({ extraction, onCreated, onCancel }: RequisitionReviewCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const ext = extraction.extracted;
  
  const [formData, setFormData] = useState<FormData>({
    item: ext?.item || "",
    quantity: ext?.quantity || 1,
    delivery_location: ext?.delivery_location || "",
    required_date: ext?.required_date || "",
    priority: ext?.priority || "NORMAL",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      item: ext?.item || "",
      quantity: ext?.quantity || 1,
      delivery_location: ext?.delivery_location || "",
      required_date: ext?.required_date || "",
      priority: ext?.priority || "NORMAL",
    });
    setErrors({});
    setServerError(null);
  }, [ext]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? (value === "" ? "" : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const pr = await createPurchaseRequest({
        ...result.data,
        raw_message: extraction.raw_message,
      });
      onCreated(pr);
    } catch (error) {
      if (isApiError(error)) {
        setServerError(error.detail);
      } else {
        setServerError("An unexpected error occurred while creating the request.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasBackendErrors = extraction.validation_errors && Object.keys(extraction.validation_errors).length > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          {extraction.is_valid ? (
            <><CheckCircle2 className="size-4 text-green-500" /> Extracted Requisition</>
          ) : (
            <><AlertCircle className="size-4 text-amber-500" /> Review Needed</>
          )}
        </h3>
      </div>
      
      <div className="p-4">
        {hasBackendErrors && (
          <div className="mb-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
            <p className="font-semibold mb-1">Missing or invalid details from your message:</p>
            <ul className="list-disc pl-5">
              {Object.entries(extraction.validation_errors!).map(([field, msg]) => (
                <li key={field}>{field}: {msg}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item Description</Label>
              <Input 
                id="item" 
                name="item"
                value={formData.item}
                onChange={handleChange}
                disabled={isSubmitting} 
              />
              {errors.item && <p className="text-xs text-destructive">{errors.item}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input 
                id="quantity" 
                name="quantity"
                type="number" 
                value={formData.quantity}
                onChange={handleChange}
                disabled={isSubmitting} 
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_location">Delivery Location</Label>
              <Input 
                id="delivery_location" 
                name="delivery_location"
                value={formData.delivery_location}
                onChange={handleChange}
                disabled={isSubmitting} 
              />
              {errors.delivery_location && <p className="text-xs text-destructive">{errors.delivery_location}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_date">Required Date</Label>
              <Input 
                id="required_date" 
                name="required_date"
                type="date" 
                value={formData.required_date}
                onChange={handleChange}
                disabled={isSubmitting} 
              />
              {errors.required_date && <p className="text-xs text-destructive">{errors.required_date}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
            </div>
          </div>

          {serverError && (
            <AlertBanner status="critical" title="Save Failed" description={serverError} />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-6">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                "Create purchase request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
