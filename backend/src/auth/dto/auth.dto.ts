import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../email.util';

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
  // Normaliza (trim + minúsculas) ANTES da validação — o ValidationPipe roda
  // com transform:true. Assim o e-mail chega canônico ao service e ao audit log.
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'O e-mail deve ser um endereço de e-mail válido.' })
  @MaxLength(254) // RFC 5321
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'A senha deve ter pelo menos 12 caracteres.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula.',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve conter pelo menos uma letra minúscula.',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
  password!: string;
}

export class LoginDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'O e-mail deve ser um endereço de e-mail válido.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MaxLength(128)
  password!: string;
}
