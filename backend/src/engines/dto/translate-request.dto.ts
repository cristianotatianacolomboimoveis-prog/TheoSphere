import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class TranslateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  targetLang: string;
}
