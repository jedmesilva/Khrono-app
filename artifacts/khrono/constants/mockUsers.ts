export type MockUser = {
  contact: string;
  type: "email" | "phone";
  name: string;
  firstName: string;
  password: string;
};

export const MOCK_USERS: MockUser[] = [
  {
    contact: "joao@email.com",
    type: "email",
    name: "João Silva",
    firstName: "João",
    password: "senha123",
  },
  {
    contact: "11999999999",
    type: "phone",
    name: "Ana Lima",
    firstName: "Ana",
    password: "senha123",
  },
];

export function findMockUser(contact: string): MockUser | undefined {
  return MOCK_USERS.find(
    (u) => u.contact === contact.toLowerCase().trim()
  );
}
