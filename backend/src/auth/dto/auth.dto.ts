import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Strong password policy:
 *   - 12+ chars (NIST 800-63B recommends ≥ 8; we go above for B2B/B2C2)
 *   - at least one uppercase, one lowercase, one digit
 *   - no length limit beyond 128 (avoid bcrypt 72-byte truncation surprises)
 *
 * Note: the field is intentionally named `password`, NOT `passwordHash`.
 * Clients send plaintext over TLS; the backend hashes with bcrypt cost 12.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'email must be a valid e-mail address' })
  @MaxLength(254) // RFC 5321
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'password must be at least 12 characters' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a digit' })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
