import { randomUUID } from "crypto";

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  createdAt?: Date;
}

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

export class User {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;
  public readonly createdAt: Date;

  private constructor(props: Required<UserProps>) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.createdAt = props.createdAt;
  }

  public static create(props: UserProps): User {
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
    if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
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
