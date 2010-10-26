#! /usr/bin/perl -w

use strict;

use JSON::XS;
use DBI;
use Data::Dumper;

my $dbh;
eval {
	$dbh = DBI->connect("dbi:SQLite:20101024.water.db");
};
if ($@) {
	die $@;
}

my $metrics = $dbh->selectall_arrayref("
	select * from metric 
	where 
--	(
--		dateTime = '2010-10-16T00:00:00.000-07:00'
--			   strftime('%Y-%m-%d', dateTime) = '2010-10-16' 
--		or	   strftime('%Y-%m-%d', dateTime) = '2010-10-15'
--		or	   strftime('%Y-%m-%d', dateTime) = '2010-10-14'
--	) and 
	valueType = '00060' and 
	value >= 0
	;",
##	[ qw(siteCode valueType value dateTime) ], 
	);

my $sites = $dbh->selectall_arrayref("
	select * from site
	where siteName like '%SAN JOAQUIN R %'
	or    siteName like '%KLAMATH R %'
	or    siteName like '%RUSSIAN R %'
	or    siteName like '%TRINITY R %'
	or    siteName like '%TRUCKEE R %'
	or    siteName like '%SACRAMENTO R%'	
	or    siteName like '%TUOLUMNE R%'
	or    siteName like '%MERCED R%'
	or    siteName like '%COACHELLA CANAL%'
	;",
##	[ qw(siteCode siteName latitude longtitude) ], 
	);

my $metricsHash = {};
my $dateHash = {};
foreach  my $r (@$metrics) {
	my $date = $r->[3];
	$date =~ s/(.*?)T.*/$1/;
	if (not defined $dateHash->{$date}) { $dateHash->{$date} = scalar (keys %{$dateHash}); }
	$metricsHash->{$r->[0]}->{$dateHash->{$date}}->{$r->[1]} = $r->[2];
}
open DATAJS, "> data.js" or
	die "could not open data.js";

my $coder = JSON::XS->new->ascii->pretty->allow_nonref;
print DATAJS "var dates = ", $coder->encode ($dateHash), ";\n\n";
print DATAJS "var metrics = ", $coder->encode ($metricsHash), ";\n\n";
print DATAJS "var sites = ", $coder->encode ($sites), ";\n";

close DATAJS or
	die "could not close DATAJS";