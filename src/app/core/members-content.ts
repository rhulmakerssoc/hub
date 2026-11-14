import { IconLink } from '../site-content';

/*
 * The members-only content. It is written in private/content.json and
 * private/faqs.html, encrypted by "npm run protect", and only exists in
 * readable form in a signed-in member's browser.
 */

export interface LabSheet {
  title: string;
  /** Path inside private/files/, e.g. 'pdf/CAD/C01 - TinkerCAD Quickstart.pdf' */
  file: string;
}

export interface LabSheetGroup {
  heading: string;
  sheets: LabSheet[];
}

export interface ProtectedFile {
  /** Name of the encrypted copy in public/protected/ (without .bin) */
  id: string;
  type: string;
  size: number;
}

export interface MembersContent {
  calendarEmbedUrl: string;
  community: IconLink[];
  labSheetGroups: LabSheetGroup[];
  faqsHtml: string;
  /** Every protected file, keyed by its path inside private/files/ */
  files: Record<string, ProtectedFile>;
}
