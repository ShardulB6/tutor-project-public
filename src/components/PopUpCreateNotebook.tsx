import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type React from "react";
import { useState } from "react";

type PopUpCreateNotebookProps = {
  onCreate: (data: { title: string }) => void | Promise<void>;
};

export function PopUpCreateNotebook({ onCreate }: PopUpCreateNotebookProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = (new FormData(event.currentTarget).get("title") as string).trim();
    await onCreate({ title: title || "New Notebook" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#1A1D22] text-white hover:bg-[#1A1D22]/90">Create Notebook</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Notebook</DialogTitle>
            <DialogDescription>Enter a title for your new notebook.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="notebook-title">Title</Label>
              <Input id="notebook-title" name="title" defaultValue="New Notebook" />
            </Field>
          </FieldGroup>
          <DialogFooter className="pt-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create Notebook</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
