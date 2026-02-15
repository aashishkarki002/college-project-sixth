import React from "react";
import { Input } from "@/components/ui/input";
import { Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown } from "lucide-react";
import { Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TenantCard from "../components/TenantCard";
import api from "../../plugins/axios";
import { toast } from "sonner";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedInnerBlock, setSelectedInnerBlock] = useState(null);
  const [search, setSearch] = useState("");
  const isInitialMount = useRef(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fetchProperties = async () => {
    try {
      const response = await api.get("/api/property/get-property");
      const data = await response.data;
      setProperties(data.property || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      if (error.response?.status === 401) {
        // Don't show toast for properties 401 - it's already handled by tenants or interceptor
        setProperties([]);
      } else {
        // Only show error if it's not a 401 (401 is handled by interceptor/tenants)
        if (error.response?.status !== 401) {
          toast.error(
            "Failed to load properties. Some features may be limited."
          );
        }
        setProperties([]);
      }
    }
  };

  const filterTenants = async (override = {}) => {
    setLoading(true);
    try {
      const params = {};
      const searchVal = override.search !== undefined ? override.search : search;

      if (searchVal && String(searchVal).trim()) {
        params.search = String(searchVal).trim();
      }

      if (selectedBlock && selectedBlock._id) {
        params.block = selectedBlock._id;
      }

      if (selectedInnerBlock && selectedInnerBlock._id) {
        params.innerBlock = selectedInnerBlock._id;
      }

      const response = await api.get(`/api/tenant/search-tenants`, {
        params,
      });

      const data = await response.data;
      setTenants(data.tenants || []);
    } catch (error) {
      console.error("Error filtering tenants:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        setTenants([]);
      } else {
        toast.error("Failed to filter tenants. Please try again.");
        setTenants([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if token exists
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const fetchtenants = async () => {
        try {
          const response = await api.get("/api/tenant/get-tenants");
          const data = await response.data;
          setTenants(data.tenants || []);
        } catch (error) {
          console.error("Error fetching tenants:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired. Please login again.");
            // The axios interceptor should handle redirect, but we'll set empty state
            setTenants([]);
          } else {
            toast.error("Failed to load tenants. Please try again.");
          }
        }
      };

      // Fetch both in parallel
      await Promise.all([fetchtenants(), fetchProperties()]);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
      } else {
        toast.error("Failed to load data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load: if URL has ?search=, filter by it; otherwise fetch all tenants
  useEffect(() => {
    const q = searchParams.get("search");
    let searchFromUrl = "";
    if (q != null && q !== "") {
      try {
        searchFromUrl = decodeURIComponent(q).trim();
      } catch {
        searchFromUrl = q.trim();
      }
    }

    if (searchFromUrl) {
      setSearch(searchFromUrl);
      Promise.all([
        fetchProperties(),
        filterTenants({ search: searchFromUrl }),
      ]);
    } else {
      fetchData();
    }
  }, []);

  useEffect(() => {
    // Skip filtering on initial mount to avoid double fetch
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Filter tenants when search, selectedBlock, or selectedInnerBlock changes
    // Only filter if at least one filter is active, otherwise show all tenants
    const hasSearch = search && search.trim();
    if (hasSearch || selectedBlock || selectedInnerBlock) {
      filterTenants();
    } else {
      // If no filters are active, fetch all tenants
      const fetchtenants = async () => {
        setLoading(true);
        try {
          const response = await api.get("/api/tenant/get-tenants");
          const data = await response.data;
          setTenants(data.tenants || []);
        } catch (error) {
          console.error("Error fetching tenants:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired. Please login again.");
            setTenants([]);
          } else {
            toast.error("Failed to load tenants. Please try again.");
          }
        } finally {
          setLoading(false);
        }
      };
      fetchtenants();
    }
  }, [search, selectedBlock, selectedInnerBlock]);

  const HandleDeleteTenant = () => {
    fetchData();
  };

  return (
    <div>
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Tenants</h1>
      </div>
      <p className="text-gray-500 text-xl">Manage your residents and their details</p>
      <div className="flex flex-wrap justify-between items-center my-4 gap-2 sm:gap-4 w-full">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Search by name, unit, block"
            className="pl-10 h-10 w-full text-sm border-gray-300 rounded-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdown */}
        <div className="w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10 w-full sm:w-auto justify-center"
              >
                {selectedBlock
                  ? selectedInnerBlock
                    ? `${selectedBlock.name} - ${selectedInnerBlock.name}`
                    : selectedBlock.name
                  : "Select Block"}
                <ArrowDown className="w-5 h-5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-full sm:w-56" align="start">
              <DropdownMenuLabel>
                {selectedBlock
                  ? selectedInnerBlock
                    ? `${selectedBlock.name} - ${selectedInnerBlock.name}`
                    : selectedBlock.name
                  : "Select Block"}
              </DropdownMenuLabel>
              {(selectedBlock || selectedInnerBlock) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedBlock(null);
                      setSelectedInnerBlock(null);
                    }}
                  >
                    Clear Filter
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuGroup className="flex flex-col gap-1">
                {properties && properties.length > 0 ? (
                  properties.flatMap((property) =>
                    property.blocks && property.blocks.length > 0
                      ? property.blocks.map((block) => (
                        <DropdownMenuSub key={block._id}>
                          <DropdownMenuSubTrigger
                            className="w-full text-left"
                          >
                            {block.name || `Block ${block._id}`}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-full sm:w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBlock(block);
                                setSelectedInnerBlock(null);
                              }}
                            >
                              All units in {block.name || `Block ${block._id}`}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {block.innerBlocks &&
                              block.innerBlocks.length > 0 ? (
                              block.innerBlocks.map((innerBlock) => (
                                <DropdownMenuItem
                                  key={innerBlock._id}
                                  onClick={() => {
                                    setSelectedBlock(block);
                                    setSelectedInnerBlock(innerBlock);
                                  }}
                                >
                                  {innerBlock.name ||
                                    `Inner Block ${innerBlock._id}`}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>
                                No inner blocks
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))
                      : []
                  )
                ) : (
                  <DropdownMenuItem disabled>
                    No blocks available
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full sm:w-auto">
          <Button className=" text-blue-50 h-10 px-4 rounded-md  flex 
           items-center gap-2 w-full sm:w-auto justify-center
           cursor-pointer
           "
            onClick={() => {
              navigate("/tenant/send-message");
            }}
          >
            <Send className="w-5 h-5" />
            Send Message
          </Button>
        </div>
        {/* Add Tenant Button */}
        <div className="w-full sm:w-auto">
          <Button
            className="bg-primary text-primary-foreground h-10 px-4 rounded-md hover:bg-primary/90 flex 
           items-center gap-2 w-full sm:w-auto justify-center
           cursor-pointer
           "
            onClick={() => {
              navigate("/tenant/addTenants");
            }}
          >
            <Plus className="w-5 h-5" />
            Add new Tenant
          </Button>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Spinner className="size-10" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="col-span-full">
            <p className="text-center text-gray-500 py-12">No tenants found</p>
          </div>
        ) : (
          tenants.map((tenant) => (
            <TenantCard
              key={tenant._id}
              tenant={tenant}
              HandleDeleteTenant={HandleDeleteTenant}
            />
          ))
        )}
      </div>
    </div>
  );
}
