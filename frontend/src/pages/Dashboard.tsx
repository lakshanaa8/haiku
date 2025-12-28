import { usePatients } from "@/hooks/use-patients";
import { useCalls } from "@/hooks/use-calls";
import { StatsCards } from "@/components/StatsCards";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: patients, isLoading: loadingPatients } = usePatients();
  const { data: calls, isLoading: loadingCalls } = useCalls();

  // Join data for display: calls usually link to patients, but for this view we might show them separately or joined.
  // Assuming 1:1 for simplicity in this view based on schema (calls have patientId)

  return (
    <div className="min-h-screen pt-24 pb-12 bg-slate-50">
      <div className="container mx-auto px-4 space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of patient appointments and call analytics.</p>
        </div>

        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Patient List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="font-display text-xl">Recent Patients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[200px]">Patient Name</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPatients ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : patients?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No patients found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      patients?.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{patient.name}</span>
                              <span className="text-xs text-muted-foreground">{patient.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{patient.healthIssue}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`
                                ${patient.severity === 'high' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                                ${patient.severity === 'moderate' ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}
                                ${patient.severity === 'low' ? 'bg-teal-50 text-teal-600 border-teal-200' : ''}
                              `}
                            >
                              {patient.severity.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(patient.appointmentDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <button className="text-primary hover:text-primary/80 font-medium text-sm">
                              View Details
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* AI Call Analysis Sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg shadow-black/5 h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="font-display text-xl flex items-center gap-2">
                  <Phone className="w-5 h-5 text-teal-500" />
                  AI Call Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-4">
                    {loadingCalls ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : calls?.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground">
                        No calls recorded yet.
                      </div>
                    ) : (
                      calls?.map((call) => (
                        <div key={call.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <Badge 
                              className={`
                                ${call.sentimentLabel === 'Hot' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                              `}
                            >
                              {call.sentimentLabel || 'Analyzing...'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {call.createdAt ? format(new Date(call.createdAt), "h:mm a") : 'Just now'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${
                              call.status === 'completed' ? 'bg-green-500' : 
                              call.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                            }`} />
                            <span className="text-sm font-medium capitalize text-slate-700">
                              Status: {call.status}
                            </span>
                          </div>

                          {call.transcription && (
                            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 italic max-h-24 overflow-y-auto">
                              {call.transcription.includes('processing') || call.transcription.includes('progress') ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span className="text-blue-600">{call.transcription}</span>
                                </div>
                              ) : (
                                <span>"{call.transcription}"</span>
                              )}
                            </div>
                          )}
                          
                          {call.audioUrl && (
                            <audio controls className="w-full mt-3 h-8">
                              <source src={`/api/calls/${call.id}/audio`} type="audio/wav" />
                              Your browser does not support the audio element.
                            </audio>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
