export type FieldType = "text" | "number" | "date" | "boolean" | "select";
export type EntityType = "deal" | "contact" | "company";

export interface CustomField {
  id: string;
  organizationId: string;
  entityType: EntityType;
  name: string;
  fieldType: FieldType;
  options: string[] | null;
  isRequired: boolean;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  value: string;
}

export interface CustomFieldWithValue extends CustomField {
  value: string;
}
