import { ApiProperty } from '@nestjs/swagger';
import { roleEnum, type Role } from '@/database/schema/enums';

export class SessionUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dr. Claire Mutoni' })
  name: string;

  @ApiProperty({ example: 'doctor.chuk@rwhms.gov.rw' })
  email: string;

  @ApiProperty({ type: String, nullable: true, example: 'Senior Cardiologist' })
  title: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'en' })
  preferredLocale: string;
}

export class FacilityMembershipDto {
  @ApiProperty({ format: 'uuid' })
  facilityId: string;

  @ApiProperty({ example: 'FAC-001' })
  facilityCode: string;

  @ApiProperty({ example: 'University Teaching Hospital of Kigali' })
  facilityName: string;

  @ApiProperty({ enum: roleEnum.enumValues, enumName: 'Role' })
  role: Role;
}

export class AuthSessionDto {
  @ApiProperty({ type: SessionUserDto })
  user: SessionUserDto;

  @ApiProperty({ type: [FacilityMembershipDto] })
  memberships: FacilityMembershipDto[];

  @ApiProperty({ description: 'Send back in the X-CSRF-Token header on every write request' })
  csrfToken: string;
}
