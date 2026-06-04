import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Percent, Package } from 'lucide-react';

export default function EstimateSummary({ estimate, categoryTotals }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const categories = [
    { key: 'Materials', color: 'bg-blue-500' },
    { key: 'Labor', color: 'bg-green-500' },
    { key: 'Equipment', color: 'bg-purple-500' },
    { key: 'Miscellanea', color: 'bg-amber-500' },
    { key: 'Subcontractor', color: 'bg-red-500' },
  ];

  const totalCost = Object.values(categoryTotals || {}).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-4">
      {/* Main totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Cost</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(estimate?.total_cost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600">Sale Price</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(estimate?.proposal_sale_price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Percent className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Margin</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatPercent(estimate?.margin_pct)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            Cost Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map(({ key, color }) => {
              const value = categoryTotals?.[key] || 0;
              const percentage = totalCost > 0 ? (value / totalCost) * 100 : 0;
              
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-slate-600">{key}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-medium text-slate-900">
                    {formatCurrency(value)}
                  </div>
                  <div className="w-12 text-right text-xs text-slate-400">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional pricing info */}
      {(estimate?.price_escalation_pct > 0 || estimate?.effective_cost) && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {estimate?.price_escalation_pct > 0 && (
                <>
                  <div>
                    <p className="text-slate-500">Escalation</p>
                    <p className="font-semibold text-slate-900">{formatPercent(estimate.price_escalation_pct)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Effective Cost</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(estimate.effective_cost)}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-slate-500">
                  {estimate?.target_margin_pct ? 'Target Margin' : 'Markup'}
                </p>
                <p className="font-semibold text-slate-900">
                  {formatPercent(estimate?.target_margin_pct || estimate?.proposal_markup_pct)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <Badge variant="outline">{estimate?.status || 'Draft'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}