"use client";

import Link from "next/link";
import { Edit2, Share, Trash2, MoreVertical } from "lucide-react";
import { GiBeveledStar, GiCursedStar, GiMazeCornea } from "react-icons/gi";
import {
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ButtonGroup } from "@/components/ui/button-group";
import { type SessionItem, type StarType } from "./utils";

interface SessionListItemProps {
  session: SessionItem;
  isActive: boolean;
  onSetStarType: (sessionId: string, starType: StarType) => void;
  onRequestDelete: (
    sessionId: string,
    sessionTitle: string,
    isActive: boolean,
  ) => void;
  onRequestRename: (sessionId: string, currentTitle: string) => void;
  isBirthChartReportSession?: boolean;
}

function SessionIcon({ session, isBirthChartReportSession }: { session: SessionItem; isBirthChartReportSession?: boolean }) {
  if (isBirthChartReportSession) {
    return <GiMazeCornea className="h-4 w-4 text-primary" />;
  }
  if (session.starType === "cursed") {
    return <GiCursedStar className="h-4 w-4 text-galactic" />;
  }
  if (session.starType === "beveled") {
    return <GiBeveledStar className="h-4 w-4 text-primary" />;
  }
  return null;
}

export function SessionListItem({
  session,
  isActive,
  onSetStarType,
  onRequestDelete,
  onRequestRename,
  isBirthChartReportSession = false,
}: SessionListItemProps) {
  return (
    <SidebarMenuSubItem className="group/item relative">
      {/*
       * pr-8 is constant — always reserves space on the right for the
       * action button, so the title always has room to truncate cleanly.
       * The SidebarMenuSubButton base CVA has overflow-hidden, which
       * combined with truncate flex-1 on the span gives proper ellipsis.
       */}
      <SidebarMenuSubButton
        asChild
        isActive={isActive}
        className="pr-8 transition-colors duration-300 group h-10 w-62 flex items-center gap-3 rounded-md border border-transparent text-foreground/70 hover:bg-accent/40 hover:text-primary data-[active=true]:bg-accent/40 data-[active=true]:text-primary data-[active=true]:font-medium"
      >
        <Link href={`/oracle/chat/${session._id}`}>
          {/* Icon — report sessions get the birth chart glyph; starred sessions get star glyphs. */}
          {(session.starType || isBirthChartReportSession) && (
            <span className="shrink-0 w-5 flex items-center justify-center">
              <SessionIcon session={session} isBirthChartReportSession={isBirthChartReportSession} />
            </span>
          )}

          {/* Title — takes all remaining space and truncates with ellipsis */}
          <span
            className={`flex-1 text-sm font-sans truncate ${!(session.starType || isBirthChartReportSession) ? "pl-1" : ""}`}
          >
            {session.title}
          </span>
        </Link>
      </SidebarMenuSubButton>

      {/* Three-dot action button — absolutely positioned, appears only on hover */}
      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/30 hover:bg-accent/40 hover:text-primary aria-expanded:bg-accent/40 aria-expanded:text-primary"
              aria-label="Session options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-48 border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
          >
            {/* Star buttons as button group */}
            <div className="px-1 py-1">
              <ButtonGroup orientation="horizontal" className="w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStarType(
                      session._id,
                      session.starType === "beveled" ? null : "beveled",
                    );
                  }}
                  className={`h-8 w-full flex items-center justify-center rounded-l-md transition-colors ${
                    session.starType === "beveled"
                      ? "text-primary hover:bg-primary/10"
                      : "text-foreground/40 hover:bg-primary/10 hover:text-primary"
                  }`}
                  aria-label={
                    session.starType === "beveled" ? "Unstar" : "Star"
                  }
                >
                  <GiBeveledStar className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStarType(
                      session._id,
                      session.starType === "cursed" ? null : "cursed",
                    );
                  }}
                  className={`h-8 w-full flex items-center justify-center rounded-r-md transition-colors ${
                    session.starType === "cursed"
                      ? "text-galactic hover:bg-galactic/10"
                      : "text-foreground/40 hover:bg-galactic/10 hover:text-galactic"
                  }`}
                  aria-label={
                    session.starType === "cursed"
                      ? "Unstar cursed"
                      : "Star cursed"
                  }
                >
                  <GiCursedStar className="h-4 w-4" />
                </button>
              </ButtonGroup>
            </div>

            <DropdownMenuItem
              onClick={() => onRequestRename(session._id, session.title)}
              className="gap-2 cursor-pointer"
            >
              <Edit2 className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              className="gap-2 cursor-pointer text-foreground/50"
            >
              <Share className="h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() =>
                onRequestDelete(session._id, session.title, isActive)
              }
              className="gap-2 cursor-pointer text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarMenuSubItem>
  );
}
