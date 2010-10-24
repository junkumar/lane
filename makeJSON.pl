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
	where (strftime('%Y-%m-%d %H', dateTime) = '2010-10-16 01' 
	or	  strftime('%Y-%m-%d %H', dateTime) = '2010-10-15 01'
	or	  strftime('%Y-%m-%d %H', dateTime) = '2010-10-14 01')
	and   valueType = '00065'
	;",
##	[ qw(siteCode valueType value dateTime) ], 
	);

my $sites = $dbh->selectall_arrayref("
	select * from site;",
##	[ qw(siteCode siteName latitude longtitude) ], 
	);


open DATAJS, "> data.js" or
	die "could not open data.js";

my $coder = JSON::XS->new->ascii->pretty->allow_nonref;
print DATAJS "var metrics = ", $coder->encode ($metrics), ";\n\n";
print DATAJS "var sites = ", $coder->encode ($sites), ";\n";

close DATAJS or
	die "could not close DATAJS";