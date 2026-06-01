import { ThemeProvider } from "../providers/theme";
import { ToastProvider } from "../providers/toast";
import { InputStackProvider } from "../providers/input-stack";
import { DialogProvider } from "../providers/dialog";
import AppLayout from "./app";
import { Outlet } from "react-router";

const RootLayout = () => (
  <ThemeProvider>
    <ToastProvider>
      <InputStackProvider>
        <DialogProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </DialogProvider>
      </InputStackProvider>
    </ToastProvider>
  </ThemeProvider>
);

export default RootLayout;
