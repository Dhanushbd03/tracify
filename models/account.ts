export type Account = {
  id: string;
  name: string;
};

export type AccountsResponse = {
  success: boolean;
  data: Account[];
  error?: {
    message: string;
    details: string;
  };
};

