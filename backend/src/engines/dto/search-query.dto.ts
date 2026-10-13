import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  q!: string;
  // Sem `userId`: a identidade vem do JWT (req.user). Com forbidNonWhitelisted,
  // um cliente que ainda envie `userId` recebe 400 em vez de ser ignorado.
}
