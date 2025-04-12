export type ToolResultSchema = {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError: boolean;
};
