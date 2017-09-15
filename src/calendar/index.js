import React, {Component} from 'react';
import {
  View,
  ViewPropTypes,
  Animated,
  Image,
  Easing,
} from 'react-native';
import PropTypes from 'prop-types';

import XDate from 'xdate';
import dateutils from '../dateutils';
import {xdateToData, parseDate} from '../interface';
import styleConstructor from './style';
import Day from './day/basic';
import UnitDay from './day/interactive';
import DayDotOver from './day/dotOver';
import CalendarHeader from './header';
import shouldComponentUpdate from './updater';

//Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes;
const interactiveLikeDays = ['dotOver', 'interactive'];
const markingTypeDayCompMap = {
  'dotOver': DayDotOver,
  'interactive': UnitDay,
  'simple': Day,
};

const EmptyArray = [];

class Calendar extends Component {
  static propTypes = {
    // Specify theme properties to override specific styles for calendar parts. Default = {}
    theme: PropTypes.object,
    // Collection of dates that have to be marked. Default = {}
    markedDates: PropTypes.object,

    // Specify style for calendar container element. Default = {}
    style: viewPropTypes.style,

    selected: PropTypes.array,

    // Initially visible month. Default = Date()
    current: PropTypes.any,
    // Minimum date that can be selected, dates before minDate will be grayed out. Default = undefined
    minDate: PropTypes.any,
    // Maximum date that can be selected, dates after maxDate will be grayed out. Default = undefined
    maxDate: PropTypes.any,

    // If firstDay=1 week starts from Monday. Note that dayNames and dayNamesShort should still start from Sunday.
    firstDay: PropTypes.number,

    // Date marking style [simple/interactive/dotOver]. Default = 'simple'
    markingType: PropTypes.string,

    // Hide month navigation arrows. Default = false
    hideArrows: PropTypes.bool,
    // Display loading indicador. Default = false
    displayLoadingIndicator: PropTypes.bool,
    // Do not show days of other months in month page. Default = false
    hideExtraDays: PropTypes.bool,

    // Handler which gets executed on day press. Default = undefined
    onDayPress: PropTypes.func,
    // Handler which gets executed when visible month changes in calendar. Default = undefined
    onMonthChange: PropTypes.func,
    onVisibleMonthsChange: PropTypes.func,
    // Replace default arrows with custom ones (direction can be 'left' or 'right')
    renderArrow: PropTypes.func,
    // Month format in calendar title. Formatting values: http://arshaw.com/xdate/#Formatting
    monthFormat: PropTypes.string,
    // Disables changing month when click on days of other months (when hideExtraDays is false). Default = false
    disableMonthChange: PropTypes.bool,
    //Hide day names. Default = false
    hideDayNames: PropTypes.bool,
    // Should we animate the selection of the dates?
    // Keep in mind this is expected to work only with a simple date selection using markedDates
    //  (continuous dates are selected, and the first date has startingDay checked and the last one has endingDay)
    // Default = undefined
    shouldAnimateRangeSelection: PropTypes.bool,
    // The duration (in MS) of the animation, in case shouldAnimateRangeSelection is set to true.
    // Default = 560
    animationDuration: PropTypes.number,
    // Function to be called as the animation .start() callback. Default = undefined
    onAnimationComplete: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.style = styleConstructor(this.props.theme);
    let currentMonth;
    if (props.current) {
      currentMonth = parseDate(props.current);
    } else {
      currentMonth = props.selected && props.selected[0] ? parseDate(props.selected[0]) : XDate();
    }
    this.state = {
      currentMonth
    };

    this.updateMonth = this.updateMonth.bind(this);
    this.addMonth = this.addMonth.bind(this);
    this.isSelected = this.isSelected.bind(this);
    this.pressDay = this.pressDay.bind(this);
    this.shouldComponentUpdate = shouldComponentUpdate;
    this.animationMap = {};
    this.currentAnimation = null;
  }

  componentWillReceiveProps(nextProps) {
    const current= parseDate(nextProps.current);
    if (current && current.toString('yyyy MM') !== this.state.currentMonth.toString('yyyy MM')) {
      this.setState({
        currentMonth: current.clone()
      });
    }

    if (this.props.markedDates !== nextProps.markedDates) {
      if (nextProps.shouldAnimateRangeSelection && this.isRangeSelected(nextProps.markedDates)) {
        this.animationMap = this.createAnimationMap(nextProps.markedDates, nextProps.animationDuration);
        console.log('Starting animation!');
        this.startAnimationFromAnimationMap();
      }
    }
  }

  updateMonth(day, doNotTriggerListeners) {
    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }
    this.setState({
      currentMonth: day.clone()
    }, () => {
      if (!doNotTriggerListeners) {
        const currMont = this.state.currentMonth.clone();
        if (this.props.onMonthChange) {
          this.props.onMonthChange(xdateToData(currMont));
        }
        if (this.props.onVisibleMonthsChange) {
          this.props.onVisibleMonthsChange([xdateToData(currMont)]);
        }
      }
    });
  }

  pressDay(day) {
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    if (!(minDate && !dateutils.isGTE(day, minDate)) && !(maxDate && !dateutils.isLTE(day, maxDate))) {
      const shouldUpdateMonth = this.props.disableMonthChange === undefined || !this.props.disableMonthChange;
      if (shouldUpdateMonth) {
        this.updateMonth(day);
      }
      if (this.props.onDayPress) {
        this.props.onDayPress(xdateToData(day));
      }
    }
  }

  addMonth(count) {
    this.updateMonth(this.state.currentMonth.clone().addMonths(count, true));
  }

  isSelected(day) {
    let selectedDays = [];
    if (this.props.selected) {
      selectedDays = this.props.selected;
    }
    for (let i = 0; i < selectedDays.length; i++) {
      if (dateutils.sameDate(day, parseDate(selectedDays[i]))) {
        return true;
      }
    }
    return false;
  }

  renderDay(day, id) {
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    let state = '';
    if (this.isSelected(day)) {
      state = 'selected';
    } else if ((minDate && !dateutils.isGTE(day, minDate)) || (maxDate && !dateutils.isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!dateutils.sameMonth(day, this.state.currentMonth)) {
      state = 'disabled';
    } else if (dateutils.sameDate(day, XDate())) {
      state = 'today';
    }
    let dayComp;
    if (!dateutils.sameMonth(day, this.state.currentMonth) && this.props.hideExtraDays) {
      if (interactiveLikeDays.indexOf(this.props.markingType) !== -1) {
        dayComp = (<View key={id} style={{flex: 1}}/>);
      } else {
        dayComp = (<View key={id} style={{width: 32}}/>);
      }
    } else {
      const DayComp = markingTypeDayCompMap[this.props.markingType] || Day;
      const markingExists = this.props.markedDates ? true : false;
      const markingForDay = this.getDateMarking(day);
      const animationValue = this.getAnimationValue(day);
      if (markingForDay) {
        // console.log(animationValue);
      }
      dayComp = (
        <DayComp
          key={id}
          state={state}
          theme={this.props.theme}
          onPress={this.pressDay}
          day={day}
          marked={this.getDateMarking(day)}
          markingExists={markingExists}
          animationValue={animationValue}
          currentMonth={this.state.currentMonth}
        >
          {day.getDate()}
        </DayComp>
      );
    }
    return dayComp;
  }

  isRangeSelected(dates) {
    const status = Object.keys(dates).reduce((obj, key) => {
      const curr = dates[key];
      const item = Array.isArray(curr) && curr[0] ? curr[0] : curr;
      obj.hasStartingDay = obj.hasStartingDay || !!item.startingDay;
      obj.hasEndingDay = obj.hasEndingDay || !!item.endingDay;
      return obj;
    }, {hasStartingDay: false, hasEndingDay: false});

    return status.hasStartingDay && status.hasEndingDay;
  }

  createAnimationMap(dates, duration = 560) {
    const animationMap = {};
    const datesKeys = Object.keys(dates).sort();

    // Some optimizations are being done here:
    //  1. We check if the starting / ending date are inside this month, otherwise
    //   just return an empty map.
    //  2. Instead of animating all dates that are offscreen, we will render
    //   those directly, and animate only the ones "visible".
    //   By visible, we mean the dates from the last month selected
    //    and the previous two.

    const nDates = datesKeys.length;
    const firstDayOfCurrentMonth = this.state.currentMonth.clone().setDate(1);
    const firstDay = parseDate(datesKeys[0]);
    const lastDay = parseDate(datesKeys[nDates-1]);
    const WEEKS_VISIBLE = 5; // 10 weeks.
    let ignoredDays = 0;

    if (
      !dateutils.sameMonth(firstDayOfCurrentMonth, firstDay)
      && !dateutils.sameMonth(firstDayOfCurrentMonth, lastDay)
      && !(
        dateutils.isGTE(firstDayOfCurrentMonth, firstDay)
        && dateutils.isLTE(firstDayOfCurrentMonth, lastDay)
      )
    ) {
      // ignore this month!
      return {};
    }

    const validDatesInfo = {};

    // loop two times, first one just to retrieve
    //  all valid days, and to count how many days were skipped.
    const validDates = datesKeys.reduce((prev, date) => {
      const parsedDate = parseDate(date);
      const shouldAnimate = Math.abs(lastDay.diffDays(parsedDate)) / 7 < WEEKS_VISIBLE;
      const curr = dates[date];
      const item = Array.isArray(curr) && curr[0] ? curr[0] : curr;

      if (!item.color) {
        return prev;
      }

      validDatesInfo[date] = {
        shouldAnimate,
        parsedDate,
      };

      if (!shouldAnimate) {
        ignoredDays++;
      }

      return [
        ...prev,
        date,
      ];
    }, []);

    validDates.forEach((date, idx) => {
      const { shouldAnimate, parsedDate } = validDatesInfo[date];

      animationMap[date] = {
        animation: null,
        // casting the inverse of shouldAnimate to int would return the appropriate number
        value: new Animated.Value(+(!shouldAnimate)),
      };

      if (shouldAnimate) {
        animationMap[date].animation = Animated.timing(
          animationMap[date].value,
          {
            toValue: 1,
            duration: Math.max(duration / validDates.length - ignoredDays, 10),
            easing: Easing.linear,
          }
        );
      }
    });

    return animationMap;
  }
  
  startAnimationFromAnimationMap() {
    const animationMap = this.animationMap;
    // if we are here, we expect markedDates to be valid.
    const markedDates = Object.keys(this.props.markedDates);
    const lastDay = parseDate(markedDates[markedDates.length - 1]);
    const isThisCalendarForTheLastDay = dateutils.sameMonth(this.state.currentMonth, lastDay);

    const animations = Object.keys(animationMap).sort().map(date => animationMap[date].animation).filter(animation => !!animation);

    if (!animations.length) {
      return;
    }

    if (this.currentAnimation) {
      this.currentAnimation.stop();
    }

    // only pass the callback to the calendar with the last day.
    this.currentAnimation = Animated.sequence(animations).start(
      isThisCalendarForTheLastDay ? this.props.onAnimationComplete : undefined
    );
  }

  getAnimationValue(day) {
    const animation = this.animationMap[day.toString('yyyy-MM-dd')] || {};

    return animation.value;
  }

  getDateMarking(day) {
    if (!this.props.markedDates) {
      return false;
    }
    const dates = this.props.markedDates[day.toString('yyyy-MM-dd')] || EmptyArray;
    if (dates.length || dates) {
      return dates;
    } else {
      return false;
    }
  }

  renderWeek(days, id) {
    const week = [];
    days.forEach((day, id2) => {
      week.push(this.renderDay(day, id2));
    }, this);
    return (<View style={this.style.week} key={id}>{week}</View>);
  }

  render() {
    const days = dateutils.page(this.state.currentMonth, this.props.firstDay);
    const weeks = [];
    while (days.length) {
      weeks.push(this.renderWeek(days.splice(0, 7), weeks.length));
    }
    let indicator;
    const current = parseDate(this.props.current);
    if (current) {
      const lastMonthOfDay = current.clone().addMonths(1, true).setDate(1).addDays(-1).toString('yyyy-MM-dd');
      if (this.props.displayLoadingIndicator &&
          !(this.props.markedDates && this.props.markedDates[lastMonthOfDay])) {
        indicator = true;
      }
    }
    return (
      <View style={[this.style.container, this.props.style]}>
        <CalendarHeader
          theme={this.props.theme}
          hideArrows={this.props.hideArrows}
          month={this.state.currentMonth}
          addMonth={this.addMonth}
          showIndicator={indicator}
          firstDay={this.props.firstDay}
          renderArrow={this.props.renderArrow}
          monthFormat={this.props.monthFormat}
          hideDayNames={this.props.hideDayNames}
        />
        {weeks}
        {this.props.renderCalendarFooter && this.props.renderCalendarFooter(this.state.currentMonth.toISOString())}
      </View>);
  }
}

export default Calendar;
