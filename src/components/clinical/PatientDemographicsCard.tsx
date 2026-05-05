// @ts-nocheck
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Calendar, Activity, Hash, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PatientDemographics {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  mrn: string; // Medical Record Number
  status: "active" | "inactive" | "discharged";
}

export interface PatientDemographicsCardProps {
  patient: PatientDemographics;
  onEdit?: () => void;
}

function calculateAge(dobString: string): number {
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function PatientDemographicsCard({ patient, onEdit }: PatientDemographicsCardProps) {
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Card tone="raised" className="relative overflow-hidden">
      {/* Top Accent Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--accent)]" />
      
      <CardHeader className="pb-4 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-muted)] text-[var(--accent)] flex items-center justify-center font-display text-2xl border border-[var(--border)] shadow-sm">
              {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-2xl mb-1">
                {patient.firstName} {patient.lastName}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Badge variant="outline" className="text-[10px] font-mono">
                  MRN: {patient.mrn}
                </Badge>
                <Badge 
                  tone={patient.status === "active" ? "success" : "neutral"} 
                  className="text-[10px]"
                >
                  {patient.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} className="text-text-muted hover:text-[var(--accent)]">
              <Edit3 className="w-4 h-4" />
              <span className="sr-only">Edit Demographics</span>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
          
          {/* Bio Data */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Biological Data
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Date of Birth</p>
                <p className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-subtle" />
                  {new Date(patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Age</p>
                <p className="text-sm font-medium text-text">{age} years</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Sex assigned at birth</p>
                <p className="text-sm font-medium text-text capitalize">{patient.gender}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Blood Type</p>
                <p className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[var(--danger)]" />
                  Unknown
                </p>
              </div>
            </div>
          </div>

          {/* Contact Data */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-3 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Contact Information
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-text-subtle mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Primary Phone</p>
                  <p className="text-sm font-medium text-text">{patient.phone}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-text-subtle mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Email Address</p>
                  <p className="text-sm font-medium text-text">{patient.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-text-subtle mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Home Address</p>
                  <p className="text-sm font-medium text-text">
                    {patient.address.line1}
                    {patient.address.line2 && <><br/>{patient.address.line2}</>}
                    <br/>
                    {patient.address.city}, {patient.address.state} {patient.address.zip}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}
