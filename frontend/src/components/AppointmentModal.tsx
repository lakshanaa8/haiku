import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient } from "@shared/schema";
import { useCreatePatient } from "@/hooks/use-patients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Enhance schema with Zod coercion for better form handling
const formSchema = insertPatientSchema.extend({
  appointmentDate: z.coerce.date(),
});

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentModal({ open, onOpenChange }: AppointmentModalProps) {
  const { mutate, isPending } = useCreatePatient();
  
  const form = useForm<InsertPatient>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      healthIssue: "",
      severity: "moderate",
      // appointmentDate is handled separately
    },
  });

  function formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except leading +
    let cleaned = phone.replace(/\D/g, '');
    
    // If it's an Indian number (starts with 91 or just 10 digits), ensure +91 prefix
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // Otherwise, prepend + if not present
    if (!phone.startsWith('+')) {
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  function onSubmit(data: InsertPatient) {
    // Format phone number with country code
    const formattedPhone = formatPhoneNumber(data.phone);
    
    // Validate: prevent using Twilio phone number
    if (formattedPhone.includes('16822444811')) {
      form.setError('phone', {
        message: 'This is the clinic phone number. Please enter YOUR actual phone number.'
      });
      return;
    }
    
    mutate({ ...data, phone: formattedPhone }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        // Show server-side validation errors
        const errorMsg = error?.response?.data?.message || 'Failed to book appointment';
        form.setError('phone', {
          message: errorMsg
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-r from-primary/10 to-accent/20 p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary">Book Appointment</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground/80">
              Fill in your details and we'll confirm your slot.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 pt-4 bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="rounded-xl h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="9840063038 or +919840063038" 
                          className="rounded-xl h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use Indian numbers (10 digits) or include country code
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low - Routine Checkup</SelectItem>
                          <SelectItem value="moderate">Moderate - Discomfort</SelectItem>
                          <SelectItem value="high">High - Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="healthIssue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health Concern</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe your symptoms..." className="rounded-xl h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Preferred Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal h-11 rounded-xl",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full mt-4 bg-gradient-to-r from-primary to-teal-500 hover:to-teal-600 text-lg h-12 rounded-xl shadow-lg shadow-primary/20"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Appointment"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
