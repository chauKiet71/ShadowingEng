import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateAdminUserPremiumDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  premiumExpiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  packageId?: string | null;
}
