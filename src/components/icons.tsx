import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "stroke"> & {
  size?: number;
  stroke?: number;
};

function IconBase({
  size = 24,
  stroke = 2,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={stroke}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return <IconBase {...props}><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17a3 3 0 0 0 6 0" /></IconBase>;
}

export function IconMenu2(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h16M4 12h16M4 18h16" /></IconBase>;
}

export function IconX(props: IconProps) {
  return <IconBase {...props}><path d="M18 6 6 18M6 6l12 12" /></IconBase>;
}

export function IconBuildingCommunity(props: IconProps) {
  return <IconBase {...props}><path d="M4 21V9l5-4 5 4v12" /><path d="M14 21V7h6v14" /><path d="M8 21v-5h2v5M17 11h1M17 15h1" /></IconBase>;
}

export function IconTimeline(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h4M4 12h10M4 18h16" /><path d="M10 6h10" /></IconBase>;
}

export function IconUsers(props: IconProps) {
  return <IconBase {...props}><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M17 9a3 3 0 1 0 0-6" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="M16 18h5v-1a5 5 0 0 0-4-4.9" /></IconBase>;
}

export function IconUser(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></IconBase>;
}

export function IconSettings(props: IconProps) {
  return <IconBase {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" /></IconBase>;
}

export function IconMessageCircle(props: IconProps) {
  return <IconBase {...props}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-4-.9L3 21l1.5-4.5A8.5 8.5 0 1 1 21 11.5Z" /></IconBase>;
}

export function IconArrowRight(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14M13 6l6 6-6 6" /></IconBase>;
}

export function IconHeart(props: IconProps) {
  return <IconBase {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></IconBase>;
}

export function IconPhoto(props: IconProps) {
  return <IconBase {...props}><rect height="16" rx="2" width="18" x="3" y="4" /><path d="m3 16 5-5 4 4 2-2 7 7" /><path d="M14 8h.01" /></IconBase>;
}

export function IconEye(props: IconProps) {
  return <IconBase {...props}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></IconBase>;
}

export function IconEyeOff(props: IconProps) {
  return <IconBase {...props}><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 4.1" /><path d="M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7c1.3 0 2.5-.3 3.5-.7" /></IconBase>;
}

export function IconBrandGoogle(props: IconProps) {
  return <IconBase {...props}><path d="M20 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.5a3.8 3.8 0 0 1-1.7 2.5v2h2.7c1.6-1.5 2.5-3.7 2.5-6.2Z" /><path d="M12 20c2.3 0 4.2-.8 5.6-2.1l-2.7-2a5 5 0 0 1-7.5-2.6H4.6v2.1A8.5 8.5 0 0 0 12 20Z" /><path d="M7.4 13.3a5 5 0 0 1 0-2.6V8.6H4.6a8.5 8.5 0 0 0 0 6.8l2.8-2.1Z" /><path d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.4-2.4A8.2 8.2 0 0 0 12 3.5a8.5 8.5 0 0 0-7.4 4.7l2.8 2.1A5 5 0 0 1 12 6.9Z" /></IconBase>;
}

export function IconArrowLeft(props: IconProps) {
  return <IconBase {...props}><path d="M19 12H5M11 6l-6 6 6 6" /></IconBase>;
}

export function IconMailCheck(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /><path d="m15 15 2 2 4-4" /></IconBase>;
}

export function IconMail(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></IconBase>;
}

export function IconCircleCheck(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-5" /></IconBase>;
}

export function IconCamera(props: IconProps) {
  return <IconBase {...props}><path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3" /></IconBase>;
}

export function IconClock(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></IconBase>;
}

export function IconCircleDashed(props: IconProps) {
  return <IconBase {...props}><path d="M12 3a9 9 0 0 1 9 9" /><path d="M21 12a9 9 0 0 1-9 9" /><path d="M12 21a9 9 0 0 1-9-9" /><path d="M3 12a9 9 0 0 1 9-9" /></IconBase>;
}

export function IconRuler(props: IconProps) {
  return <IconBase {...props}><path d="M4 17 17 4l3 3L7 20l-3-3Z" /><path d="m14 7 3 3M11 10l2 2M8 13l3 3" /></IconBase>;
}

export function IconArrowsJoin(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h6a4 4 0 0 1 4 4v6" /><path d="M4 17h6a4 4 0 0 0 4-4V7" /><path d="m11 4 3 3 3-3" /><path d="m11 20 3-3 3 3" /></IconBase>;
}

export function IconCheck(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>;
}

export function IconPlus(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
}

export function IconBookmark(props: IconProps) {
  return <IconBase {...props}><path d="M6 4h12v17l-6-4-6 4z" /></IconBase>;
}

export function IconTrendingUp(props: IconProps) {
  return <IconBase {...props}><path d="m3 17 6-6 4 4 7-7" /><path d="M14 8h6v6" /></IconBase>;
}

export function IconSearch(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></IconBase>;
}

export function IconFilter(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h16M7 12h10M10 18h4" /></IconBase>;
}

export function IconSortDescending(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h9M4 12h6M4 18h3" /><path d="M17 5v14M14 16l3 3 3-3" /></IconBase>;
}

export function IconSortAscending(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h3M4 12h6M4 18h9" /><path d="M17 5v14M14 8l3-3 3 3" /></IconBase>;
}

export function IconMapPin(props: IconProps) {
  return <IconBase {...props}><path d="M12 21s7-5.3 7-12a7 7 0 0 0-14 0c0 6.7 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></IconBase>;
}

export function IconLink(props: IconProps) {
  return <IconBase {...props}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2" /></IconBase>;
}

export function IconCalendar(props: IconProps) {
  return <IconBase {...props}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></IconBase>;
}

export function IconShare(props: IconProps) {
  return <IconBase {...props}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></IconBase>;
}

export function IconChevronRight(props: IconProps) {
  return <IconBase {...props}><path d="m9 6 6 6-6 6" /></IconBase>;
}

export function IconChevronDown(props: IconProps) {
  return <IconBase {...props}><path d="m6 9 6 6 6-6" /></IconBase>;
}

export function IconSend(props: IconProps) {
  return <IconBase {...props}><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></IconBase>;
}

export function IconEdit(props: IconProps) {
  return <IconBase {...props}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 7.5 3 3" /></IconBase>;
}

export function IconExternalLink(props: IconProps) {
  return <IconBase {...props}><path d="M14 4h6v6" /><path d="m10 14 10-10" /><path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" /></IconBase>;
}

export function IconFileText(props: IconProps) {
  return <IconBase {...props}><path d="M14 3v5h5" /><path d="M6 3h8l5 5v13H6z" /><path d="M9 13h6M9 17h6M9 9h2" /></IconBase>;
}

export function IconTrash(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></IconBase>;
}

export function IconGripVertical(props: IconProps) {
  return <IconBase {...props}><path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" /></IconBase>;
}

export function IconAlertTriangle(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4M12 17h.01" /></IconBase>;
}

export function IconBan(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></IconBase>;
}

export function IconDownload(props: IconProps) {
  return <IconBase {...props}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></IconBase>;
}

export function IconLock(props: IconProps) {
  return <IconBase {...props}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></IconBase>;
}

export function IconLogout(props: IconProps) {
  return <IconBase {...props}><path d="M14 8V5a2 2 0 0 0-2-2H5v18h7a2 2 0 0 0 2-2v-3" /><path d="M9 12h12" /><path d="m17 8 4 4-4 4" /></IconBase>;
}

export function IconGlobe(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></IconBase>;
}

export function IconBed(props: IconProps) {
  return <IconBase {...props}><path d="M4 11V6a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v4" /><path d="M4 11h16a2 2 0 0 1 2 2v5" /><path d="M4 18V9" /><path d="M2 18h20" /></IconBase>;
}

export function IconBath(props: IconProps) {
  return <IconBase {...props}><path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z" /><path d="M6 12V5a2 2 0 0 1 2-2h1" /><path d="M4 20 3 22M20 20l1 2" /><path d="M8 6h4" /></IconBase>;
}

export function IconToiletPaper(props: IconProps) {
  return <IconBase {...props}><path d="M6 10a4 4 0 1 1 8 0v10H6V10Z" /><path d="M14 10h4a3 3 0 0 1 0 6h-4" /><path d="M9 13h.01" /></IconBase>;
}

export function IconCarGarage(props: IconProps) {
  return <IconBase {...props}><path d="M3 21V9l9-6 9 6v12" /><path d="M7 21v-7h10v7" /><path d="M9 17h.01M15 17h.01" /><path d="M8 14l1.2-3h5.6L16 14" /></IconBase>;
}

export function IconHardHat(props: IconProps) {
  return <IconBase {...props}><path d="M12 4a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8Z" /><path d="M2 14h20" /><path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h13a1.5 1.5 0 0 0 1.5-1.5V14" /><path d="M12 4V2" /></IconBase>;
}

export function IconPlant(props: IconProps) {
  return <IconBase {...props}><path d="M12 21v-9" /><path d="M12 12c0-4 4-6 8-5-1 5-4 7-8 5Z" /><path d="M12 12c0-4-4-6-8-5 1 5 4 7 8 5Z" /></IconBase>;
}

export function IconHome(props: IconProps) {
  return <IconBase {...props}><path d="M3 12L12 3L21 12V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V12" /><path d="M9 21V12h6v9" /></IconBase>;
}

export function IconBuilding(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-5h4v5" /></IconBase>;
}
