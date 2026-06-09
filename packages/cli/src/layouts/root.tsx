import { ThemeProvider } from "../providers/theme";
import { ToastProvider } from "../providers/toast";
import { InputStackProvider } from "../providers/input-stack";
import { DialogProvider } from "../providers/dialog";
import { SessionCtxProvider } from "../providers/session-context";
import AppLayout from "./app";
import { Outlet } from "react-router";

const RootLayout = () => (
  <ThemeProvider>
    <ToastProvider>
      <InputStackProvider>
        <DialogProvider>
          <SessionCtxProvider>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </SessionCtxProvider>
        </DialogProvider>
      </InputStackProvider>
    </ToastProvider>
  </ThemeProvider>
);

export default RootLayout;
