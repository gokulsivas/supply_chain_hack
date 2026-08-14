// Save as: frontend/src/app/procurement/ai-assistant/page.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Extracted {
  item: string;
  quantity: number;
  deliveryLocation: string;
  requiredDate: string;
  priority: string;
}

export default function AIAssistantPage() {
  const [message, setMessage] = useState('');
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleExtract() {
    if (!message.trim()) return;
    setLoading(true);
    setSuccess(null);
    try {
      const res = await api.post('/procurement/extract', { message });
      setExtracted(res.data.data.extracted);
      setIsValid(res.data.data.isValid);
      setErrors(res.data.data.errors);
    } catch (err) {
      console.error(err);
      alert('Failed to reach AI assistant. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePR() {
    if (!extracted) return;
    setSubmitting(true);
    try {
      const res = await api.post('/procurement/purchase-requests', {
        ...extracted,
        rawMessage: message,
      });
      setSuccess(`Purchase Request ${res.data.data.requestCode} created successfully.`);
      setExtracted(null);
      setMessage('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-6 text-2xl font-bold">AI Procurement Assistant</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Describe what you need</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder='e.g. "I need 100 laptops for Bangalore warehouse by August 20."'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Button onClick={handleExtract} disabled={loading || !message.trim()}>
            {loading ? 'Thinking...' : 'Send to AI'}
          </Button>
        </CardContent>
      </Card>

      {extracted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Extracted Requisition
              {isValid ? (
                <Badge className="bg-green-600">Valid</Badge>
              ) : (
                <Badge variant="destructive">Invalid</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Item:</strong> {extracted.item}</p>
            <p><strong>Quantity:</strong> {extracted.quantity}</p>
            <p><strong>Location:</strong> {extracted.deliveryLocation}</p>
            <p><strong>Required Date:</strong> {extracted.requiredDate}</p>
            <p><strong>Priority:</strong> {extracted.priority}</p>

            {!isValid && errors && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">
                {Object.entries(errors)
                  .filter(([key]) => key !== '_errors')
                  .map(([field, val]: any) => (
                    <p key={field}>
                      &#10060; {field}: {val?._errors?.join(', ')}
                    </p>
                  ))}
              </div>
            )}

            <Button onClick={handleCreatePR} disabled={!isValid || submitting} className="mt-4">
              {submitting ? 'Creating...' : 'Create Purchase Request'}
            </Button>
          </CardContent>
        </Card>
      )}

      {success && (
        <div className="mt-4 rounded bg-green-50 p-4 text-green-700">{success}</div>
      )}
    </div>
  );
}