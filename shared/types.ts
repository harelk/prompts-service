export type PromptStatus = "draft" | "active" | "in_progress" | "done" | "archived";
export type PromptOwner = "raout" | "harel" | "dvora" | "claude";

export interface Service {
  id: string;
  name: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  rawTranscription: string | null;
  status: PromptStatus;
  owner: PromptOwner;
  createdAt: string;
  updatedAt: string;
  services: Service[];
}

export interface CreatePromptBody {
  title: string;
  content: string;
  status?: PromptStatus;
  owner?: PromptOwner;
  serviceIds?: string[];
}

export interface UpdatePromptBody {
  title?: string;
  content?: string;
  status?: PromptStatus;
  owner?: PromptOwner;
  serviceIds?: string[];
}

export interface CreateServiceBody {
  name: string;
}

export interface VoiceTranscribeResult {
  rawTranscription: string;
  cleanedText: string;
  suggestedTitle: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}
