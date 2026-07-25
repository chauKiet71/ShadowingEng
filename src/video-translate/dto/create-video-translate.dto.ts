import { IsOptional, IsString, MinLength } from 'class-validator';

/** Kept for compatibility; create job now expects multipart file upload. */
export class CreateVideoTranslateDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  url?: string;
}
