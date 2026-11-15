//! The `"HH:MM"` text the TSX side and the native time picker exchange (24-hour clock, zero padded).

/// Hour and minute of `"HH:MM"`, or `None` when the text is not a time of day.
pub fn parse(value: &str) -> Option<(u8, u8)> {
    let (hour, minute) = value.split_once(':')?;
    let two_digits = |s: &str| (s.len() == 2 && s.bytes().all(|b| b.is_ascii_digit())).then(|| s.parse::<u8>().ok()).flatten();
    let (hour, minute) = (two_digits(hour)?, two_digits(minute)?);
    (hour < 24 && minute < 60).then_some((hour, minute))
}

/// `"HH:MM"` for an hour and a minute.
pub fn format(hour: u8, minute: u8) -> String {
    format!("{hour:02}:{minute:02}")
}

/// The instant `UIDatePicker` holds for a time of day: that time on 1970-01-01 in GMT (seconds since 1970). The picker
/// runs in the GMT zone, so the value does not depend on the device's zone, its DST or its 12/24-hour display.
pub fn to_timestamp(hour: u8, minute: u8) -> f64 {
    f64::from(hour) * 3600.0 + f64::from(minute) * 60.0
}

/// The time of day of an instant, read in GMT (the minute it falls in; any day, before 1970 too).
pub fn from_timestamp(seconds: f64) -> (u8, u8) {
    let minute_of_day = ((seconds / 60.0).floor() as i64).rem_euclid(24 * 60);
    ((minute_of_day / 60) as u8, (minute_of_day % 60) as u8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_time_of_day() {
        assert_eq!(parse("09:05"), Some((9, 5)));
        assert_eq!(parse("00:00"), Some((0, 0)));
        assert_eq!(parse("23:59"), Some((23, 59)));
    }

    #[test]
    fn rejects_what_is_not_a_time() {
        for bad in ["", "9:05", "09:5", "24:00", "12:60", "ab:cd", "09-05", "09:05:00", " 09:05", "+9:05"] {
            assert_eq!(parse(bad), None, "{bad:?}");
        }
    }

    #[test]
    fn formats_with_zero_padding() {
        assert_eq!(format(9, 5), "09:05");
        assert_eq!(format(0, 0), "00:00");
        assert_eq!(format(23, 59), "23:59");
    }

    #[test]
    fn format_and_parse_round_trip() {
        for hour in 0..24 {
            for minute in 0..60 {
                assert_eq!(parse(&format(hour, minute)), Some((hour, minute)));
            }
        }
    }

    #[test]
    fn a_time_is_that_time_on_the_first_day_of_1970() {
        assert_eq!(to_timestamp(0, 0), 0.0);
        assert_eq!(to_timestamp(9, 5), 32_700.0);
        assert_eq!(to_timestamp(23, 59), 86_340.0);
    }

    #[test]
    fn an_instant_reads_back_as_its_time_of_day_on_any_day() {
        assert_eq!(from_timestamp(32_700.0), (9, 5));
        assert_eq!(from_timestamp(32_700.0 + 86_400.0 * 20_000.0), (9, 5));
        assert_eq!(from_timestamp(32_700.0 - 86_400.0 * 3.0), (9, 5));
        assert_eq!(from_timestamp(32_759.9), (9, 5));
        assert_eq!(from_timestamp(-1.0), (23, 59));
    }

    #[test]
    fn timestamps_round_trip() {
        for hour in 0..24 {
            for minute in 0..60 {
                assert_eq!(from_timestamp(to_timestamp(hour, minute)), (hour, minute));
            }
        }
    }
}
