import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LookupVocabularyWordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  word!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sentence!: string;

  @IsString()
  @MaxLength(500)
  sentenceTranslation!: string;
}

export class LearnVocabularyWordDto {
  @IsUUID()
  wordId!: string;

  @IsOptional()
  @IsBoolean()
  correct?: boolean;
}

export class ReviewVocabularyWordDto {
  @IsBoolean()
  correct!: boolean;
}
