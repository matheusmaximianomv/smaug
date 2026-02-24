import { randomUUID } from "crypto";

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  createdAt?: Date;
}

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;

  private constructor(props: Required<UserProps>) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.createdAt = props.createdAt;
  }

  static create(props: UserProps): User {
    User.validateName(props.name);
    User.validateEmail(props.email);

    return new User({
      id: props.id ?? randomUUID(),
      name: props.name.trim(),
      email: props.email.trim().toLowerCase(),
      createdAt: props.createdAt ?? new Date(),
    });
  }

  private static validateName(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 255) {
      throw new Error("Name must be between 1 and 255 characters");
    }
  }

  private static validateEmail(email: string): void {
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error("Invalid email format");
    }
  }
}
