import { IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateRoomShiftDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(1)
  @Max(24)
  endHour: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  roundHour?: number;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  nurseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  roomIds?: string[];
}

export class UpdateRoomShiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  roundHour?: number;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  nurseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  roomIds?: string[];
}

export class RoomShiftAddRoomDto {
  @IsUUID()
  roomId: string;
}
