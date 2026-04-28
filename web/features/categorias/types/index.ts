export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends Category {
  linkedExpensesCount: number;
}
