#!/bin/csh -f
set summer = http://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751 # all july 2004 files?
set bmng = world.topo.bathy.200407.3x21600x10800.jpg
# highest res. in 4x2 grid:
set bmng = world.topo.bathy.200407.3x21600x21600.A1.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.A1.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.B2.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.B2.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.C1.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.C2.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.D1.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
set bmng = world.topo.bathy.200407.3x21600x21600.D2.jpg
if ( ! -e bmng ) wget ${summer}/${bmng}
