export interface JobOpening {
  id: string;
  title: string;
  company: string;
  location?: string;
  publishedDate: string;
  registeredDate?: string;
  descriptionItems: string[];
  requirementItems: string[];
  link: string;
  additionalInfo?: { label: string; text: string }[];
}
