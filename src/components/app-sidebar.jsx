import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Wrench,
  Banknote,
  Zap,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import api from "../../plugins/axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
// Menu items
const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tenants", url: "/tenants", icon: Users },
  { title: "Rent & Payments", url: "/rent-payment", icon: DollarSign },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Cheque Drafts", url: "/cheque-drafts", icon: Banknote },
  { title: "Electricity", url: "/electricity", icon: Zap },
];

export default function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);

  const navigate = useNavigate();

  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleAccountingEnter = () => {
    setIsAccountingOpen(true);
  };

  const handleAccountingLeave = () => {
    setIsAccountingOpen(false);
  };
  const { user, logout } = useAuth();
  const SignOut = async () => {
    try {
      // Try to call the logout endpoint, but don't fail if it errors
      try {
        await api.post("/api/auth/logout");
      } catch (apiError) {
        // Log but don't show error - we'll still clear local state
      }

      // Always clear local state and redirect, regardless of API call result
      logout();
      navigate("/login");
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if there's an error, clear local state and redirect
      logout();
      navigate("/login");
      toast.success("Signed out successfully");
    }
  };
  return (
    <Sidebar variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl font-bold ml-4 md:ml-10 mt-6 text-black">
            EasyManage
          </SidebarGroupLabel>
          <Separator className="w-full h-px md:h-1 bg-gray-200 my-2" />
          <SidebarGroupLabel className="text-gray-500 font-bold text-xl">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent className="p-3">
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className="mb-2 text-gray-500"
                >
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-gray-100 hover:text-gray-800 rounded-md flex items-center gap-2"
                  >
                    <NavLink to={item.url} onClick={handleNav}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Accounting Dropdown Menu - hover only on desktop; on mobile use tap to toggle */}
              <SidebarMenuItem
                className="mb-2 text-gray-500"
                onMouseEnter={!isMobile ? handleAccountingEnter : undefined}
                onMouseLeave={!isMobile ? handleAccountingLeave : undefined}
              >
                <SidebarMenuButton
                  className="hover:bg-gray-100 hover:text-gray-800 rounded-md flex items-center gap-2"
                  onClick={() => setIsAccountingOpen((prev) => !prev)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Accounting</span>
                  {isAccountingOpen ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </SidebarMenuButton>
                {isAccountingOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        className="hover:bg-gray-100 hover:text-gray-800"
                        onClick={handleNav}
                      >
                        <Link to="/expenses">
                          <span>Expense</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        className="hover:bg-gray-100 hover:text-gray-800"
                        onClick={handleNav}
                      >
                        <Link to="/revenue">
                          <span>Revenue</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        className="hover:bg-gray-100 hover:text-gray-800"
                        onClick={handleNav}
                      >
                        <Link to="/accounting">
                          <span>Summary</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full focus:outline-none">
              <Card className="w-full bg-gray-50 hover:bg-gray-200 transition-colors">
                <CardHeader
                  className="
              flex flex-row items-center gap-3 p-2
              md:flex-col md:items-center md:p-3
            "
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col text-left md:text-center leading-tight">
                    <span className="font-semibold text-sm truncate max-w-[140px]">
                      {user?.name ?? "Admin"}
                    </span>

                    {/* Hide email on mobile */}
                    <span className="hidden md:block text-xs text-gray-500 truncate">
                      {user?.email ?? "admin@gmail.com"}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            className="w-44"
          >
            <DropdownMenuItem
              onClick={() => navigate("/admin")}
              className="cursor-pointer"
            >
              Account
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={SignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

    </Sidebar>
  );
}
