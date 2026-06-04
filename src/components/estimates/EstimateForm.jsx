import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Percent, TrendingUp } from 'lucide-react';

export default function EstimateForm({ 
  formData, 
  setFormData, 
  templates, 
  vendors, 
  useTargetMargin,
  setUseTargetMargin 
}) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-500" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template *</Label>
              <Select
                value={formData.template_id || ''}
                onValueChange={(value) => handleChange('template_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.system_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select
                value={formData.vendor_id || ''}
                onValueChange={(value) => handleChange('vendor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="design_mode">Design Mode *</Label>
              <Select
                value={formData.design_mode || ''}
                onValueChange={(value) => handleChange('design_mode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select design mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Mixed-Use">Mixed-Use</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantities */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Quantities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="head_count">Head Count *</Label>
              <Input
                id="head_count"
                type="number"
                min="1"
                value={formData.head_count || ''}
                onChange={(e) => handleChange('head_count', parseInt(e.target.value) || 0)}
                placeholder="Number of sprinkler heads"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riser_count">Riser Count *</Label>
              <Input
                id="riser_count"
                type="number"
                min="1"
                value={formData.riser_count || ''}
                onChange={(e) => handleChange('riser_count', parseInt(e.target.value) || 0)}
                placeholder="Number of risers"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5 text-green-500" />
            Pricing Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Use Target Margin</p>
              <p className="text-sm text-slate-500">Switch between markup percentage and target margin</p>
            </div>
            <Switch
              checked={useTargetMargin}
              onCheckedChange={(checked) => {
                setUseTargetMargin(checked);
                if (checked) {
                  handleChange('proposal_markup_pct', null);
                } else {
                  handleChange('target_margin_pct', null);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useTargetMargin ? (
              <div className="space-y-2">
                <Label htmlFor="target_margin_pct">Target Margin %</Label>
                <div className="relative">
                  <Input
                    id="target_margin_pct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.target_margin_pct || ''}
                    onChange={(e) => handleChange('target_margin_pct', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 25"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="proposal_markup_pct">Markup %</Label>
                <div className="relative">
                  <Input
                    id="proposal_markup_pct"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.proposal_markup_pct || ''}
                    onChange={(e) => handleChange('proposal_markup_pct', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 30"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="price_escalation_pct">Price Escalation % (Optional)</Label>
              <div className="relative">
                <Input
                  id="price_escalation_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_escalation_pct || ''}
                  onChange={(e) => handleChange('price_escalation_pct', parseFloat(e.target.value) || null)}
                  placeholder="e.g., 5"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>

          {formData.price_escalation_pct > 0 && (
            <div className="space-y-2">
              <Label htmlFor="price_escalation_note">Escalation Note</Label>
              <Textarea
                id="price_escalation_note"
                value={formData.price_escalation_note || ''}
                onChange={(e) => handleChange('price_escalation_note', e.target.value)}
                placeholder="Reason for price escalation..."
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}