import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "../ui/sidebar";
import AppSidebar from "../app-sidebar";
import Header from "../header";

export default function AppLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset>
        <header className="flex items-center border-b sm:px-4 ">
          <SidebarTrigger />
          {}
          <Header />
        </header>
        <main className="flex-1 p-4 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
