import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, User, ArrowRight, X, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { List } from 'lucide-react';
import { Filter } from 'lucide-react';
import MaintenanceCard from './components/MaintenanceCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DualCalendarTailwind from '@/components/dualDate'
import api from '../../plugins/axios';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFormik } from 'formik';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import FullCalendarView from '../components/fullCalendar';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
export default function Maintenance() {
  const [priority, setPriority] = useState("medium");
  const [tenant, setTenant] = useState([]);
  const [unit, setUnit] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [staffs, setStaffs] = useState([]);
  useEffect(() => {
    const getTenants = async () => {
      const response = await api.get("/api/tenant/get-tenants");
      setTenant(response.data.tenants);

      // Extract units from tenants (occupied units)
      const occupiedUnits = [];
      response.data.tenants.forEach(tenant => {
        if (tenant.units && Array.isArray(tenant.units)) {
          tenant.units.forEach(unit => {
            if (unit && !occupiedUnits.find(u => u._id === unit._id)) {
              occupiedUnits.push(unit);
            }
          });
        }
      });

      // Get unoccupied units
      const getUnits = async () => {
        const unitResponse = await api.get("/api/unit/get-units");
        const unoccupiedUnits = unitResponse.data.units || [];

        // Combine occupied and unoccupied units, removing duplicates
        const allUnits = [...occupiedUnits];
        unoccupiedUnits.forEach(unit => {
          if (!allUnits.find(u => u._id === unit._id)) {
            allUnits.push(unit);
          }
        });

        setUnit(allUnits);
      };
      getUnits();
    };
    getTenants();
  }, []);

  useEffect(() => {
    const getMaintenance = async () => {
      const response = await api.get("/api/maintenance/all");
      setMaintenance(response.data.maintenance);

      // Extract unique staffs from maintenance data (assignedTo field)
      const uniqueStaffs = [];
      const staffMap = new Map();

      response.data.maintenance.forEach(item => {
        if (item.assignedTo && item.assignedTo._id) {
          if (!staffMap.has(item.assignedTo._id)) {
            staffMap.set(item.assignedTo._id, item.assignedTo);
            uniqueStaffs.push(item.assignedTo);
          }
        }
      });

      setStaffs(uniqueStaffs);
    };
    getMaintenance();
  }, []);



  const formik = useFormik({
    initialValues: {
      title: "",
      category: "",
      priority: "",
      status: "",
      unit: "",
      tenant: "",
      assignTo: "",
      estimatedCost: "",
      description: "",
      scheduledDate: "",
    },
    onSubmit: async (values) => {
      try {
        // Map form values to backend model format
        // Capitalize category to match backend enum
        setIsLoading(true);
        const categoryMap = {
          repair: "Repair",
          maintenance: "Maintenance",
          inspection: "Inspection",
          other: "Other"
        };
        const mappedType = values.category ? categoryMap[values.category.toLowerCase()] || "Maintenance" : "Maintenance";

        const maintenanceData = {
          title: values.title,
          description: values.description,
          type: mappedType,
          priority: values.priority || "Medium",
          status: values.status || "OPEN",
          unit: values.unit, // Now it's the unit ID
          tenant: values.tenant || undefined,
          assignedTo: values.assignTo || undefined, // Map assignTo to assignedTo
          amount: values.estimatedCost ? parseFloat(values.estimatedCost) : 0, // Map estimatedCost to amount
          scheduledDate: values.scheduledDate ? new Date(values.scheduledDate) : new Date(),
        };

        const response = await api.post("/api/maintenance/create", maintenanceData);
        if (response.data.success) {
          toast.success("Maintenance task created successfully");
          formik.resetForm();
          setSelectedTenant(null);
          // Refresh maintenance list
          const getMaintenance = async () => {
            const response = await api.get("/api/maintenance/all");
            setMaintenance(response.data.maintenance);
          };
          getMaintenance();
        } else {
          toast.error(response.data.message || "Failed to create maintenance task");
        }
      } catch (error) {
        console.error("Error creating maintenance:", error);
        toast.error(error.response?.data?.message || "Failed to create maintenance task");
      }
      formik.resetForm();
      setIsLoading(false);
    },
  });

  // Find tenant when unit is selected
  useEffect(() => {
    if (formik.values.unit) {
      // formik.values.unit now contains the unit ID
      const unitId = formik.values.unit;

      // Find the tenant that has this unit in their units array
      const foundTenant = tenant.find(t => {
        if (t.units && Array.isArray(t.units)) {
          return t.units.some(u => {
            // Handle both populated and non-populated unit references
            const tenantUnitId = typeof u === 'object' ? u._id : u;
            return tenantUnitId?.toString() === unitId?.toString();
          });
        }
        return false;
      });

      if (foundTenant) {
        setSelectedTenant(foundTenant);
        formik.setFieldValue("tenant", foundTenant._id);
      } else {
        setSelectedTenant(null);
        formik.setFieldValue("tenant", "");
      }
    } else {
      setSelectedTenant(null);
      formik.setFieldValue("tenant", "");
    }
  }, [formik.values.unit, unit, tenant]);
  return (
    <>
      <div className='flex justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Maintenance</h1>
          <p className='text-gray-500 text-sm'>Schedule repairs and manage tasks</p></div>
        <div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className='bg-blue-600 text-blue-50 mr-2 w-45 mt-2 p-2 rounded-md hover:bg-blue-800 '><Plus className="w-5 h-5 text-blue-50 " />Schedule Repair</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-white text-black max-h-[90vh] overflow-y-auto ml-8">
              <DialogHeader className="relative">
                <DialogClose asChild>
                  <Button variant="ghost" className="absolute right-0 top-0 h-6 w-6 p-0 text-black hover:bg-gray-100">

                  </Button>
                </DialogClose>
                <DialogTitle className="text-2xl font-bold text-black">Add Maintenance Task</DialogTitle>
                <DialogDescription className="text-gray-600 text-sm">
                  Log new repair or upkeep request
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={formik.handleSubmit}>
                <div className="space-y-6 mt-4 ml-5 mr-5">
                  {/* General Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">

                      <h3 className="text-lg font-semibold text-black">General Information</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-title" className="text-black">Task Title</Label>
                      <Input

                        placeholder="e.g., AC Repair or Leaking Faucet"
                        name="title"
                        id="title"
                        onChange={formik.handleChange}
                        value={formik.values.title}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-description" className="text-black">Task Description</Label>
                      <Input
                        name="description"
                        placeholder="Enter Description"
                        onChange={formik.handleChange}
                        value={formik.values.description}
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-black">Category</Label>
                      <Select onValueChange={(value) => formik.setFieldValue("category", value)} value={formik.values.category}>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-black">Priority Level</Label>
                      <div className="flex gap-2" >
                        <Button
                          name="priority"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPriority("Low");
                            formik.setFieldValue("priority", "Low");
                          }}
                          disabled={formik.values.priority === "Low"}
                          className={`flex-1 bg-white text-gray-600 border-gray-300 hover:bg-gray-50 rounded-3xl p-2 text-sm 
                          ${formik.values.priority === "Low" ? "bg-gray-600 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <Circle className="w-2 h-2 mr-2 text-gray-500 fill-gray-500" />
                          LOW
                        </Button>
                        <Button
                          name="priority"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPriority("Medium");
                            formik.setFieldValue("priority", "Medium");
                          }}
                          disabled={formik.values.priority === "Medium"}
                          className={`flex-1 bg-white text-gray-600 border-gray-300 hover:bg-gray-50 rounded-3xl p-2 text-sm 
                          ${formik.values.priority === "Medium" ? "bg-gray-600 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <Circle className="w-2 h-2 mr-2 text-green-600 fill-green-600" />
                          MEDIUM
                        </Button>
                        <Button
                          name="priority"
                          onClick={() => {
                            setPriority("High");
                            formik.setFieldValue("priority", "High");
                          }}
                          type="button"
                          variant="outline"
                          disabled={formik.values.priority === "High"}
                          className={`flex-1 bg-white text-gray-600 border-gray-300 hover:bg-gray-50 rounded-3xl p-2 text-sm 
                          ${formik.values.priority === "High" ? "bg-gray-600 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <Circle className="w-2 h-2 mr-2 text-orange-500 fill-orange-500" />
                          HIGH
                        </Button>
                        <Button
                          name="priority"
                          onClick={() => {
                            setPriority("Urgent");
                            formik.setFieldValue("priority", "Urgent");
                          }}
                          type="button"
                          variant="outline"
                          disabled={formik.values.priority === "Urgent"}
                          className={`flex-1 bg-white text-gray-600 border-gray-300 hover:bg-gray-50 rounded-3xl p-2 text-sm 
                          ${formik.values.priority === "Urgent" ? "bg-gray-600 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <Circle className="w-2 h-2 mr-2 text-red-500 fill-red-500" />
                          URGENT
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Status</Label>
                      <Select name="status" onValueChange={(value) => formik.setFieldValue("status", value)} value={formik.values.status}>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Property & Tenant Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-black">Property & Tenant</h3>
                    </div>



                    <div className="space-y-2">
                      <Label htmlFor="unit-number" className="text-black">Unit Number</Label>
                      <Select name="unit" value={formik.values.unit} onValueChange={(value) => formik.setFieldValue("unit", value)} >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select Unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          {unit.map((unitItem) => (
                            <SelectItem key={unitItem._id} value={unitItem._id}>
                              {unitItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Display Tenant Information */}
                    {selectedTenant && (
                      <div className="space-y-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                        <Label className="text-black font-semibold">Tenant Details</Label>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="text-sm text-gray-900 font-medium">{selectedTenant.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm text-gray-900">{selectedTenant.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900">{selectedTenant.phone || 'N/A'}</p>
                          </div>
                          {selectedTenant.address && (
                            <div>
                              <p className="text-xs text-gray-500">Address</p>
                              <p className="text-sm text-gray-900">{selectedTenant.address}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Staff Assignment Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-black">Assign To</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assign-to" className="text-black">Assign To Staff</Label>
                      <Select
                        name="assignTo"
                        value={formik.values.assignTo || undefined}
                        onValueChange={(value) => formik.setFieldValue("assignTo", value)}
                        disabled={staffs.length === 0}
                      >
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder={staffs.length === 0 ? "No staff available" : "Select Staff"} />
                        </SelectTrigger>
                        {staffs.length > 0 && (
                          <SelectContent className="bg-white text-black">
                            {staffs.map((staff) => (
                              <SelectItem key={staff._id} value={staff._id}>
                                {staff.name || staff.email || 'Unnamed Staff'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        )}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated-cost" className="text-black">Estimated Cost</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">₹</span>
                        <Input
                          onChange={formik.handleChange}
                          value={formik.values.estimatedCost}
                          name="estimatedCost"
                          id="estimated-cost"
                          type="number"
                          defaultValue="0.00"
                          className="bg-white text-black border-gray-300 pl-8"
                        />
                      </div>

                    </div>

                  </div>

                  {/* Timing & Documentation Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">

                      <h3 className="text-lg font-semibold text-black">Timing & Documentation</h3>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-black">Scheduled Date (English/Nepali)</Label>
                      <DualCalendarTailwind
                        value={formik.values.scheduledDate || ""}
                        onChange={(englishDate) => {
                          formik.setFieldValue("scheduledDate", englishDate);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 sm:justify-end">
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <Button disabled={isLoading} type="button" variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300">
                        Cancel
                      </Button>
                    </DialogClose>
                    {isLoading ? (
                      <Spinner className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Button disabled={isLoading} type="submit" variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">
                          Save
                        </Button>
                      </>

                    )}
                  </div>
                </DialogFooter>
              </form>

            </DialogContent>

          </Dialog>

        </div>

      </div>
      <Tabs defaultValue="list">
        <TabsList className="flex justify-between w-full ">
          <TabsTrigger value="list" className='w-1/2'>List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>

        </TabsList>

        <TabsContent value="list" className='w-full p-2 '>
          {maintenance.length > 0 ? (
            <div className='w-full flex flex-col gap-4'>
              {maintenance.map((maintenanceItem) => {
                const isExpanded = expandedCards.has(maintenanceItem._id);

                // Generate work order ID from maintenance._id
                const workOrderId = `#WO-${String(maintenanceItem._id || '').slice(-4).toUpperCase()}`;

                // Get priority styling - match image with red for urgent
                const getPriorityStyle = (priority) => {
                  const priorityUpper = priority?.toUpperCase() || '';
                  if (priorityUpper === 'HIGH' || priorityUpper === 'URGENT') {
                    return 'bg-red-600 text-red-100';
                  } else if (priorityUpper === 'MEDIUM') {
                    return 'bg-orange-500 text-orange-100';
                  } else {
                    return 'bg-gray-500 text-gray-100';
                  }
                };

                // Format status for display
                const formatStatus = (status) => {
                  if (!status) return 'Open';
                  return status.split('_').map(word =>
                    word.charAt(0) + word.slice(1).toLowerCase()
                  ).join(' ');
                };

                // Format date
                const formatDate = (date) => {
                  if (!date) return 'N/A';
                  try {
                    return new Date(date).toLocaleDateString();
                  } catch {
                    return date;
                  }
                };

                const toggleExpand = () => {
                  const newExpanded = new Set(expandedCards);
                  if (isExpanded) {
                    newExpanded.delete(maintenanceItem._id);
                  } else {
                    newExpanded.add(maintenanceItem._id);
                  }
                  setExpandedCards(newExpanded);
                };

                return (
                  <MaintenanceCard
                    className='w-full'
                    key={maintenanceItem._id}
                    maintenanceItem={maintenanceItem}
                    isExpanded={isExpanded}
                    toggleExpand={toggleExpand}
                    getPriorityStyle={getPriorityStyle}
                    formatStatus={formatStatus}
                    formatDate={formatDate}
                    workOrderId={workOrderId}
                    onUpdate={async () => {
                      const response = await api.get("/api/maintenance/all");
                      setMaintenance(response.data.maintenance);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className='w-full flex justify-center items-center h-full'>
              <Empty>
                <EmptyTitle className='text-gray-500 text-sm'>
                  No maintenance tasks found
                </EmptyTitle>

              </Empty>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className='w-full'>
          <div className='w-full'>
            <FullCalendarView maintenance={maintenance} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}