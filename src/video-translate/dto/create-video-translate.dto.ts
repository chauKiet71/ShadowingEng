import { IsString, MinLength } from 'class-validator';

export class CreateVideoTranslateDto {
  @IsString()
  @MinLength(8)
  url!: string;
}
