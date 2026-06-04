import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  Draft: 'bg-slate-100 text-slate-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Sent: 'bg-purple-100 text-purple-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

export default function EstimateCard({ estimate, vendorName, templateName }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  return (
    <Link to={createPageUrl(`EstimateDetail?id=${estimate.id}`)}>
      <Card className="group hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-orange-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {estimate.name || estimate.estimate_number}
                </h3>
                <p className="text-sm text-slate-500">{estimate.estimate_number}</p>
              </div>
            </div>
            <Badge className={statusColors[estimate.status] || statusColors.Draft}>
              {estimate.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vendor</p>
              <p className="text-sm font-medium text-slate-700">{vendorName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Template</p>
              <p className="text-sm font-medium text-slate-700">{templateName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Heads / Risers</p>
              <p className="text-sm font-medium text-slate-700">{estimate.head_count} / {estimate.riser_count}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Design</p>
              <p className="text-sm font-medium text-slate-700">{estimate.design_mode}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">{format(new Date(estimate.created_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Sale Price</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(estimate.proposal_sale_price)}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}