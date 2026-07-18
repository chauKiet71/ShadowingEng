import { IsBoolean, IsUUID } from 'class-validator';

export class LearnVocabularyWordDto {
  @IsUUID()
  wordId!: string;
}

export class ReviewVocabularyWordDto {
  @IsBoolean()
  correct!: boolean;
}
