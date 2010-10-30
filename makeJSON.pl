#! /usr/bin/perl -w

use strict;

use JSON::XS;
use DBI;
use Data::Dumper;

my $dbh;
eval {
	$dbh = DBI->connect("dbi:SQLite:20101027.water.db");
};
if ($@) {
	die $@;
}


my $rivers = [
	{name => "Sacramento River", length => 447, flowdirection => "S", patterns => ['SACRAMENTO R ']},
	{name => "San Joaquin River", length => 330, flowdirection => "N", patterns => ['SAN JOAQUIN R ']},
	{name => "Klamath River", length => 263, flowdirection => "SW", patterns => ['KLAMATH R ']},
	{name => "Russian River", length => 110, flowdirection => "S", patterns => ['RUSSIAN R ']},
	{name => "Tuolumne River", length => 150, flowdirection => "W", patterns => ['TUOLUMNE R ']},
	{name => "Merced River", length => 112, flowdirection => "W", patterns => ['MERCED R ']},
	{name => "Trinity River", length => 130, flowdirection => "S", patterns => ['TRINITY R ']},
	{name => "Truckee River", length => 120, flowdirection => "N", patterns => ['TRUCKEE R ']},
#	{name => "Coachella Canal", length => 122, flowdirection => "E", patterns => ['COACHELLA CANAL']}, 
	{name => "Colorado River", length => 122, flowdirection => "S",	patterns => ['COLORADO RIVER ']}, 
#	{name => "Mokelumne River", length => 122, flowdirection => "W",	patterns => ['MOKELUMNE R ']}, 
#	{name => "Mojave River", length => 110, flowdirection => "E", patterns => ['MOJAVE R ']}, 
];

my $metrics = $dbh->selectall_arrayref("
	select * from metric 
	where 
	(
--		dateTime = '2010-10-16T00:00:00.000-07:00'
			       strftime('%Y-%m', dateTime) = '2010-09' 
--		or	   strftime('%Y-%m-%d', dateTime) = '2010-10-15'
--		or	   strftime('%Y-%m-%d', dateTime) = '2010-10-14'
	) and 
	valueType = '00060' and 
	value >= 0
	;",
##	[ qw(siteCode valueType value dateTime) ], 
	);

my $site_name_sql_pattern = "";
foreach (@$rivers) {
	foreach (@{$_->{patterns}}) {
		$site_name_sql_pattern .= " siteName like \'\%$_\%\' or";
	}
}
# Remove the final "or"
chop($site_name_sql_pattern);
chop($site_name_sql_pattern);

my $sql_for_sites = <<"END";
	select * from site
	where $site_name_sql_pattern
	group by siteCode;
END

my $sites = $dbh->selectall_arrayref($sql_for_sites);
##	[ qw(siteCode siteName latitude longtitude) ], 

my %peakStreamflowPerSite;

my $metricsHash = {};
my $dateHash = {};
foreach  my $r (@$metrics) {
	my ($siteCode, $valueType, $value, $date) = ($r->[0], $r->[1], $r->[2], $r->[3]);
	$date =~ s/(.*?)T.*/$1/;
	if (not defined $dateHash->{$date}) { $dateHash->{$date} = scalar (keys %{$dateHash}); }
	$metricsHash->{$r->[0]}->{$dateHash->{$date}}->{$r->[1]} = $r->[2];
	
	# track the peak streamflow across all dates for any given site
	if ($valueType == "00060") {
		if (!defined $peakStreamflowPerSite{$siteCode} ||
        $value > $peakStreamflowPerSite{$siteCode}) {
			$peakStreamflowPerSite{$siteCode} = $value;
		}
	}
}

# find peakStreamflowPerSite by river now
foreach my $site ( @$sites ) {
	my ($code, $name) = ($site->[0], $site->[1]); 

	for (my $i=0; $i < scalar @$rivers; $i++) {
          foreach my $p (@{$rivers->[$i]->{patterns}}) {
            if ($name =~ m/$p/) {
              if (defined $peakStreamflowPerSite{$code} &&
                  (!defined $rivers->[$i]->{peaksf} ||
                   $peakStreamflowPerSite{$code} > $rivers->[$i]->{peaksf})) {
                      $rivers->[$i]->{peaksf} =
                              $peakStreamflowPerSite{$code};
                      #remove before dump
                      delete $peakStreamflowPerSite{$code}; 
              }
      }
    }
  }
} 

# Rank rivers by peakStreamflow and make rank a field
my @sorted_rivers = sort { $b->{peaksf} <=> $a->{peaksf} } 
                    @$rivers;
for (my $i=0; $i < scalar @sorted_rivers; $i++) {
        $sorted_rivers[$i]->{rank} = $i+1;
}


my $revDateHash = {};
foreach my $k (keys %$dateHash) {
	$revDateHash->{$dateHash->{$k}} = $k;
}

open DATAJS, "> data.js" or
	die "could not open data.js";

my $coder = JSON::XS->new->ascii->pretty->allow_nonref;
print DATAJS "var rivers = ", $coder->encode (\@sorted_rivers), ";\n\n";
print DATAJS "var dates = ", $coder->encode ($revDateHash), ";\n\n";
print DATAJS "var metrics = ", $coder->encode ($metricsHash), ";\n\n";
print DATAJS "var sites = ", $coder->encode ($sites), ";\n";

close DATAJS or
	die "could not close DATAJS";
