"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Calculator } from "lucide-react";

const ClientAnalysis = () => {
  const [clientData, setClientData] = useState({
    name: '',
    dni: '',
    monthlyIncome: '',
    employmentType: '',
    requestedAmount: '',
    loanPurpose: '',
    creditScore: '',
  });

  const [analysisResult, setAnalysisResult] = useState<{
    isEligible: boolean;
    reason: string;
    recommendedAmount?: number;
    risk: 'low' | 'medium' | 'high';
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value
    });
  };

  const handleAnalyze = () => {
    // Simple analysis logic - this should be replaced with your actual business logic
    const monthlyIncome = parseFloat(clientData.monthlyIncome);
    const requestedAmount = parseFloat(clientData.requestedAmount);
    const creditScore = parseInt(clientData.creditScore);
    
    let isEligible = true;
    let reason = '';
    let risk: 'low' | 'medium' | 'high' = 'medium';
    
    if (monthlyIncome < requestedAmount * 0.1) {
      isEligible = false;
      reason = 'Ingresos mensuales insuficientes para el monto solicitado';
      risk = 'high';
    } else if (creditScore < 600) {
      isEligible = false;
      reason = 'Score crediticio por debajo del mínimo requerido';
      risk = 'high';
    } else if (creditScore < 700) {
      risk = 'medium';
      reason = 'Aprobado con observaciones - Score crediticio medio';
    } else {
      risk = 'low';
      reason = 'Cliente apto para el crédito solicitado';
    }

    setAnalysisResult({
      isEligible,
      reason,
      recommendedAmount: isEligible ? requestedAmount : Math.floor(monthlyIncome * 10),
      risk
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulario de análisis */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Elegibilidad</CardTitle>
          <CardDescription>
            Complete los datos del cliente para realizar el análisis crediticio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              placeholder="Nombre completo"
              value={clientData.name}
              onChange={handleInputChange}
            />
            <Input
              name="dni"
              placeholder="DNI"
              value={clientData.dni}
              onChange={handleInputChange}
            />
            <Input
              name="monthlyIncome"
              type="number"
              placeholder="Ingreso mensual"
              value={clientData.monthlyIncome}
              onChange={handleInputChange}
            />
            <Select
              onValueChange={(value) => 
                setClientData({ ...clientData, employmentType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de empleo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fulltime">Relación de dependencia</SelectItem>
                <SelectItem value="contractor">Contratado</SelectItem>
                <SelectItem value="selfemployed">Monotributista</SelectItem>
                <SelectItem value="business">Empresa</SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="requestedAmount"
              type="number"
              placeholder="Monto solicitado"
              value={clientData.requestedAmount}
              onChange={handleInputChange}
            />
            <Select
              onValueChange={(value) => 
                setClientData({ ...clientData, loanPurpose: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Destino del préstamo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">Vehículo</SelectItem>
                <SelectItem value="parts">Repuestos</SelectItem>
                <SelectItem value="motorcycle">Motocicleta</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="creditScore"
              type="number"
              placeholder="Score crediticio"
              value={clientData.creditScore}
              onChange={handleInputChange}
            />
          </div>
          <Button 
            className="mt-4 w-full"
            onClick={handleAnalyze}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Analizar Cliente
          </Button>
        </CardContent>
      </Card>

      {/* Resultados del análisis */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado del Análisis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant={analysisResult.isEligible ? "default" : "destructive"}>
                <div className="flex items-center space-x-2">
                  {analysisResult.isEligible ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {analysisResult.reason}
                  </AlertDescription>
                </div>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Característica</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Estado</TableCell>
                    <TableCell>
                      <Badge 
                        variant={analysisResult.isEligible ? "default" : "destructive"}
                      >
                        {analysisResult.isEligible ? 'APTO' : 'NO APTO'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Nivel de Riesgo</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          analysisResult.risk === 'low' 
                            ? 'default' 
                            : analysisResult.risk === 'medium' 
                              ? 'secondary' 
                              : 'destructive'
                        }
                      >
                        {analysisResult.risk === 'low' 
                          ? 'BAJO' 
                          : analysisResult.risk === 'medium' 
                            ? 'MEDIO' 
                            : 'ALTO'
                        }
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {analysisResult.recommendedAmount && (
                    <TableRow>
                      <TableCell>Monto Recomendado</TableCell>
                      <TableCell>
                        ${analysisResult.recommendedAmount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientAnalysis;