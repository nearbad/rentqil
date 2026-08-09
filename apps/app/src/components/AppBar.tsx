import React from 'react';
import { WebHeader } from './WebHeader';

export interface AppBarProps {
  // the phone bar swallows the page title and the back arrow, the web keeps
  // them in the title row below the site header and ignores these
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export function AppBar(_props: AppBarProps) {
  return <WebHeader />;
}
