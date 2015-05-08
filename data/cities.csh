#!/bin/csh -f
if ( -e worldcitiespop.txt ) then
  \ls -al worldcitiespop.txt
  exit
endif
if ( ! -e worldcitiespop.txt.gz ) wget 'http://download.maxmind.com/download/worldcities/worldcitiespop.txt.gz'
\gunzip worldcitiespop.txt.gz

