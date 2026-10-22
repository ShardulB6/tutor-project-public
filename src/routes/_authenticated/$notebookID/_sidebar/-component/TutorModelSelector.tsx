"use client";

import { BrainIcon, ChevronDownIcon, EyeIcon, FileTextIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "#/components/ai-elements/model-selector";
import { PromptInputButton } from "#/components/ai-elements/prompt-input";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "#/components/ui/tooltip";
import type { TUTOR_MODELS, TutorModelCapability, TutorModelId } from "#/lib/models";
import { cn } from "#/lib/utils";

type TutorModelOption = (typeof TUTOR_MODELS)[number];

type TutorModelSelectorProps = {
  disabled?: boolean;
  models: readonly TutorModelOption[];
  onSelect: (modelId: TutorModelId) => void;
  selectedModel: TutorModelOption;
};

const CAPABILITIES: Record<TutorModelCapability, { icon: LucideIcon; label: string }> = {
  vision: { icon: EyeIcon, label: "Understands images" },
  pdf: { icon: FileTextIcon, label: "Reads PDFs" },
  reasoning: { icon: BrainIcon, label: "Reasoning" },
};

function getModelLogo(modelId: string): string {
  return modelId.split("/")[0];
}

export function TutorModelSelector({
  disabled,
  models,
  onSelect,
  selectedModel,
}: TutorModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeProvider, setActiveProvider] = useState(selectedModel.provider);
  const providers = [...new Set(models.map((model) => model.provider))];
  // Searching looks across every provider; otherwise the rail picks one.
  const visibleModels = search
    ? models
    : models.filter((model) => model.provider === activeProvider);

  return (
    <TooltipProvider>
      <ModelSelector
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setSearch("");
            setActiveProvider(selectedModel.provider);
          }
        }}
        open={open}
      >
        <ModelSelectorTrigger asChild>
          <PromptInputButton
            aria-label={`Select model. Current model: ${selectedModel.name}`}
            className="max-w-40"
            disabled={disabled}
          >
            <ModelSelectorLogo provider={getModelLogo(selectedModel.id)} />
            <span className="truncate">{selectedModel.name}</span>
            <ChevronDownIcon className="size-3" />
          </PromptInputButton>
        </ModelSelectorTrigger>
        <ModelSelectorContent
          className="overflow-hidden sm:max-w-xl"
          showCloseButton={false}
          title="Select a tutor model"
        >
          <ModelSelectorInput
            onValueChange={setSearch}
            placeholder="Search models..."
            value={search}
          />
          <div className="flex h-[min(26rem,70vh)]">
            <nav
              aria-label="Model providers"
              className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-2"
            >
              {providers.map((provider) => {
                const isActive = !search && provider === activeProvider;
                const logoModel = models.find((model) => model.provider === provider);
                return (
                  <Tooltip key={provider}>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label={provider}
                        aria-pressed={isActive}
                        className={cn(
                          "size-10",
                          isActive ? "bg-accent" : "opacity-60 hover:opacity-100",
                        )}
                        onClick={() => {
                          setActiveProvider(provider);
                          setSearch("");
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {logoModel ? (
                          <ModelSelectorLogo
                            className="size-5"
                            provider={getModelLogo(logoModel.id)}
                          />
                        ) : null}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{provider}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
            <ModelSelectorList className="max-h-none flex-1 p-2">
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              {visibleModels.map((model) => (
                <ModelSelectorItem
                  className={cn(
                    "gap-3 px-3 py-2.5 data-[selected=true]:opacity-100",
                    model.id === selectedModel.id ? "opacity-100" : "opacity-70",
                  )}
                  key={model.id}
                  onSelect={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                  value={`${model.provider} ${model.name} ${model.id}`}
                >
                  <ModelSelectorLogo className="size-4" provider={getModelLogo(model.id)} />
                  <ModelSelectorName className="text-base font-medium">
                    {model.name}
                  </ModelSelectorName>
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-1">
                    {model.capabilities.map((capability) => {
                      const { icon: Icon, label } = CAPABILITIES[capability];
                      return (
                        <Tooltip key={capability}>
                          <TooltipTrigger asChild>
                            <span aria-label={label} className="rounded-md p-1" role="img">
                              <Icon className="size-4 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </ModelSelectorItem>
              ))}
            </ModelSelectorList>
          </div>
        </ModelSelectorContent>
      </ModelSelector>
    </TooltipProvider>
  );
}
