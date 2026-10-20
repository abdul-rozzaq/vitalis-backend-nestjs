import { IsString, IsUUID, Length, Matches } from "class-validator";

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+998[0-9]{9}$/, { message: "Phone must be a valid Uzbek number (+998XXXXXXXXX)" })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+998[0-9]{9}$/, { message: "Phone must be a valid Uzbek number (+998XXXXXXXXX)" })
  phone: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 digits" })
  code: string;
}

export class SelectPatientDto {
  @IsString()
  preAuthToken: string;

  @IsUUID()
  patientId: string;
}
