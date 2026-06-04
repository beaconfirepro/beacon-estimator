import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";

export default function PageHeader({ 
  title, 
  subtitle, 
  backTo, 
  backLabel,
  actions,
  icon: Icon 
}) {
  return (
    <div className="mb-8">
      {backTo && (
        <Link to={createPageUrl(backTo)}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {backLabel || 'Back'}
          </Button>
        </Link>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-orange-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}