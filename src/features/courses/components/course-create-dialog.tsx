"use client";

import { isValidElement, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { CourseCreateForm } from "./course-create-form";

interface CourseCreateDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CourseCreateDialog({
  children,
  open,
  onOpenChange,
}: CourseCreateDialogProps) {
  const isMobile = useIsMobile();
  const { checkout } = useCheckout();

  const handleSuccess = useCallback(() => {
    onOpenChange?.(false);
    toast.success("Course queued for generation");
  }, [onOpenChange]);

  const handleError = useCallback(
    (message: string) => {
      if (message === "SUBSCRIPTION_REQUIRED") {
        toast.error("Subscription required", {
          action: { label: "Subscribe", onClick: () => checkout() },
        });
      } else {
        toast.error(message);
      }
    },
    [checkout],
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New course</DrawerTitle>
            <DrawerDescription>
              Describe your course and Instaskul will generate the tutorials for
              you.
            </DrawerDescription>
          </DrawerHeader>
          <CourseCreateForm
            scrollable
            onSuccess={handleSuccess}
            onError={handleError}
            footer={(submit) => (
              <DrawerFooter>
                {submit}
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            )}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isValidElement(children) && <DialogTrigger render={children} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            Describe your course and Instaskul will generate the tutorials for
            you.
          </DialogDescription>
        </DialogHeader>
        <CourseCreateForm
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
}
