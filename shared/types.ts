export type PromptStatus = "draft" | "active" | "done" | "archived";

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
  createdAt: string;
  updatedAt: string;
  services: Service[];
}

export interface CreatePromptBody {
  title: string;
  content: string;
  status?: PromptStatus;
  serviceIds?: string[];
}

export interface UpdatePromptBody {
  title?: string;
  content?: string;
  status?: PromptStatus;
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
