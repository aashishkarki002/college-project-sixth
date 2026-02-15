import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "./components/app-sidebar"
export default function Home() {
  return (
    <div>
  <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
    <AppSidebar/>

    </div>
  
  );
}